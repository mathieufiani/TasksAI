"""
Pinecone service for vector storage and semantic search

Handles:
- Creating and managing Pinecone indexes
- Generating embeddings using OpenAI
- Upserting task vectors with labels
- Semantic search for task recommendations
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from pinecone import Pinecone, ServerlessSpec
from openai import AsyncOpenAI
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models.task import Task
from app.schemas.label import GeneratedLabel


class PineconeService:
    """Service for managing Pinecone vector database operations"""

    def __init__(self):
        """Initialize Pinecone and OpenAI clients"""
        self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        self.index_name = settings.PINECONE_INDEX_NAME
        self.embedding_model = settings.OPENAI_EMBEDDING_MODEL or "text-embedding-3-small"
        self.embedding_dimensions = 1536  # Default for text-embedding-3-small

        # Initialize index
        self._ensure_index_exists()

    def _ensure_index_exists(self):
        """Ensure the Pinecone index exists, create if it doesn't"""
        try:
            existing_indexes = [index.name for index in self.pc.list_indexes()]

            if self.index_name not in existing_indexes:
                print(f"Creating Pinecone index: {self.index_name}")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.embedding_dimensions,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud=settings.PINECONE_CLOUD or "aws",
                        region=settings.PINECONE_REGION or "us-east-1"
                    )
                )
                print(f"✓ Pinecone index '{self.index_name}' created successfully")
            else:
                print(f"✓ Pinecone index '{self.index_name}' already exists")

            self.index = self.pc.Index(self.index_name)

        except Exception as e:
            print(f"Error initializing Pinecone index: {str(e)}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text using OpenAI

        Args:
            text: Text to embed

        Returns:
            List of embedding values
        """
        try:
            response = await self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {str(e)}")
            raise

    def _build_task_text(
        self,
        task: Task,
        labels: Optional[List[GeneratedLabel]] = None
    ) -> str:
        """
        Build comprehensive text representation of task for embedding

        Args:
            task: Task object
            labels: Optional list of generated labels

        Returns:
            Text representation combining all task information
        """
        parts = [
            f"Title: {task.title}",
        ]

        if task.description:
            parts.append(f"Description: {task.description}")

        parts.extend([
            f"Priority: {task.priority.value}",
            f"Status: {task.status.value}",
        ])

        if task.due_date:
            parts.append(f"Due: {task.due_date.isoformat()}")

        # Add labels for richer semantic representation
        if labels:
            label_texts = [f"{label.label_name} ({label.category.value})" for label in labels]
            parts.append(f"Labels: {', '.join(label_texts)}")

        return " | ".join(parts)

    def _build_metadata(
        self,
        task: Task,
        labels: Optional[List[GeneratedLabel]] = None
    ) -> Dict[str, Any]:
        """
        Build metadata for Pinecone vector

        Args:
            task: Task object
            labels: Optional list of generated labels

        Returns:
            Metadata dictionary
        """
        metadata = {
            "task_id": task.id,
            "title": task.title,
            "priority": task.priority.value,
            "status": task.status.value,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
        }

        if task.description:
            # Truncate description for metadata (Pinecone has limits)
            metadata["description"] = task.description[:500]

        if task.due_date:
            metadata["due_date"] = task.due_date.isoformat()

        # Add label information
        if labels:
            # Store label names by category
            labels_by_category: Dict[str, List[str]] = {}
            for label in labels:
                category = label.category.value
                if category not in labels_by_category:
                    labels_by_category[category] = []
                labels_by_category[category].append(label.label_name)

            metadata["labels"] = labels_by_category

            # Store high-confidence labels separately
            high_confidence_labels = [
                label.label_name
                for label in labels
                if label.confidence >= 0.7
            ]
            metadata["high_confidence_labels"] = high_confidence_labels

        return metadata

    async def upsert_task_embedding(
        self,
        task: Task,
        labels: List[GeneratedLabel],
        db: Session
    ) -> str:
        """
        Generate and upsert task embedding to Pinecone

        Args:
            task: Task object
            labels: List of generated labels
            db: Database session

        Returns:
            Vector ID in Pinecone
        """
        try:
            # Generate vector ID if task doesn't have one
            if not task.vector_id:
                task.vector_id = f"task_{task.id}_{uuid.uuid4().hex[:8]}"

            # Build text representation
            task_text = self._build_task_text(task, labels)

            # Generate embedding
            embedding = await self.generate_embedding(task_text)

            # Build metadata
            metadata = self._build_metadata(task, labels)

            # Upsert to Pinecone
            self.index.upsert(
                vectors=[
                    {
                        "id": task.vector_id,
                        "values": embedding,
                        "metadata": metadata
                    }
                ],
                namespace=settings.PINECONE_NAMESPACE or "default"
            )

            # Update task with embedding info
            task.embedding_model = self.embedding_model
            task.embedding_version = "v1"
            db.commit()

            print(f"✓ Task {task.id} embedding upserted to Pinecone with ID: {task.vector_id}")
            return task.vector_id

        except Exception as e:
            print(f"Error upserting task embedding: {str(e)}")
            raise

    async def search_similar_tasks(
        self,
        query_text: str,
        top_k: int = 10,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar tasks using semantic search

        Args:
            query_text: Text query describing the context/situation
            top_k: Number of results to return
            filter_dict: Optional metadata filters

        Returns:
            List of matching tasks with scores
        """
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query_text)

            # Search Pinecone
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict,
                namespace=settings.PINECONE_NAMESPACE or "default"
            )

            # Format results
            matches = []
            for match in results.matches:
                matches.append({
                    "task_id": match.metadata.get("task_id"),
                    "score": match.score,
                    "title": match.metadata.get("title"),
                    "priority": match.metadata.get("priority"),
                    "labels": match.metadata.get("labels", {}),
                    "high_confidence_labels": match.metadata.get("high_confidence_labels", []),
                    "metadata": match.metadata
                })

            return matches

        except Exception as e:
            print(f"Error searching similar tasks: {str(e)}")
            raise

    async def delete_task_vector(self, vector_id: str):
        """
        Delete a task vector from Pinecone

        Args:
            vector_id: Vector ID to delete
        """
        try:
            self.index.delete(
                ids=[vector_id],
                namespace=settings.PINECONE_NAMESPACE or "default"
            )
            print(f"✓ Deleted vector {vector_id} from Pinecone")
        except Exception as e:
            print(f"Error deleting vector: {str(e)}")
            raise

    def get_index_stats(self) -> Dict[str, Any]:
        """Get statistics about the Pinecone index"""
        try:
            stats = self.index.describe_index_stats()
            return {
                "total_vectors": stats.total_vector_count,
                "dimension": stats.dimension,
                "index_fullness": stats.index_fullness,
                "namespaces": stats.namespaces
            }
        except Exception as e:
            print(f"Error getting index stats: {str(e)}")
            return {}
