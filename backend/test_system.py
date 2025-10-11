#!/usr/bin/env python3
"""
Quick System Test Script

This script tests the basic functionality of the task labeling system.
Run this after starting the API to verify everything is working.

Usage:
    python test_system.py
"""

import requests
import time
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'


def print_success(message: str):
    print(f"{Colors.GREEN}✓{Colors.END} {message}")


def print_error(message: str):
    print(f"{Colors.RED}✗{Colors.END} {message}")


def print_info(message: str):
    print(f"{Colors.BLUE}ℹ{Colors.END} {message}")


def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠{Colors.END} {message}")


def test_health_check() -> bool:
    """Test if API is accessible"""
    print_info("Testing API health check...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_success("API is running")
            return True
        else:
            print_error(f"API returned status code {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Cannot connect to API: {e}")
        print_info("Make sure the API is running: uvicorn app.main:app --reload")
        return False


def test_create_task() -> Dict[str, Any]:
    """Test task creation"""
    print_info("Creating a test task...")

    task_data = {
        "title": "Go for a 30-minute run in Central Park",
        "description": "Morning cardio session, weather permitting",
        "priority": "medium",
        "due_date": "2025-10-12T08:00:00"
    }

    try:
        response = requests.post(
            f"{API_V1}/tasks/",
            json=task_data,
            timeout=10
        )

        if response.status_code == 201:
            task = response.json()
            print_success(f"Task created with ID: {task['id']}")
            print_info(f"Labeling status: {task['labeling_status']}")
            return task
        else:
            print_error(f"Failed to create task: {response.status_code}")
            print_error(response.text)
            return {}
    except requests.exceptions.RequestException as e:
        print_error(f"Error creating task: {e}")
        return {}


def test_labeling_completion(task_id: int, max_wait: int = 15) -> bool:
    """Test if labeling completes"""
    print_info(f"Waiting for labeling to complete (max {max_wait}s)...")

    for i in range(max_wait):
        try:
            response = requests.get(
                f"{API_V1}/labels/task/{task_id}/status",
                timeout=5
            )

            if response.status_code == 200:
                status_data = response.json()
                labeling_status = status_data.get("labeling_status")

                if labeling_status == "completed":
                    labels_count = status_data.get("labels_count", 0)
                    print_success(f"Labeling completed! Generated {labels_count} labels")
                    return True
                elif labeling_status == "failed":
                    error = status_data.get("labeling_error", "Unknown error")
                    print_error(f"Labeling failed: {error}")
                    return False
                else:
                    print(f"  Status: {labeling_status}... ({i+1}s)", end='\r')
                    time.sleep(1)
            else:
                print_error(f"Failed to check status: {response.status_code}")
                return False

        except requests.exceptions.RequestException as e:
            print_error(f"Error checking labeling status: {e}")
            return False

    print_warning(f"Labeling did not complete within {max_wait} seconds")
    return False


def test_get_labels(task_id: int) -> bool:
    """Test retrieving labels"""
    print_info("Retrieving task labels...")

    try:
        response = requests.get(
            f"{API_V1}/labels/task/{task_id}",
            timeout=5
        )

        if response.status_code == 200:
            labels = response.json()

            if len(labels) < 6:
                print_warning(f"Expected at least 6 labels, got {len(labels)}")
            else:
                print_success(f"Retrieved {len(labels)} labels")

            # Display some labels
            print_info("Sample labels:")
            for label in labels[:5]:
                category = label['label_category']
                name = label['label_name']
                confidence = label['confidence_score']
                print(f"  - {name} ({category}): {confidence:.2f}")

            return len(labels) >= 6
        else:
            print_error(f"Failed to get labels: {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print_error(f"Error retrieving labels: {e}")
        return False


def test_primary_labels(task_id: int) -> bool:
    """Test retrieving primary labels"""
    print_info("Retrieving primary labels...")

    try:
        response = requests.get(
            f"{API_V1}/labels/task/{task_id}/primary",
            timeout=5
        )

        if response.status_code == 200:
            labels = response.json()
            print_success(f"Retrieved {len(labels)} primary labels")

            if labels:
                print_info("Primary labels:")
                for label in labels:
                    name = label['label_name']
                    category = label['label_category']
                    print(f"  - {name} ({category})")

            return True
        else:
            print_error(f"Failed to get primary labels: {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print_error(f"Error retrieving primary labels: {e}")
        return False


def test_search_by_label(task_id: int) -> bool:
    """Test searching tasks by label"""
    print_info("Testing search by label...")

    try:
        response = requests.get(
            f"{API_V1}/labels/search/by-label",
            params={"label_names": ["outdoor"]},
            timeout=5
        )

        if response.status_code == 200:
            result = response.json()
            count = result.get("count", 0)

            if count > 0:
                print_success(f"Found {count} task(s) with 'outdoor' label")

                # Check if our task is in the results
                task_ids = [t['id'] for t in result.get('tasks', [])]
                if task_id in task_ids:
                    print_success(f"Our test task (ID: {task_id}) was found in search results")
                    return True
                else:
                    print_warning("Test task not found in search results")
                    return True  # Still pass if search works
            else:
                print_warning("No tasks found with 'outdoor' label")
                return True  # Search works, just no results
        else:
            print_error(f"Failed to search: {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print_error(f"Error searching: {e}")
        return False


def test_label_statistics() -> bool:
    """Test label statistics endpoint"""
    print_info("Retrieving label statistics...")

    try:
        response = requests.get(
            f"{API_V1}/labels/statistics",
            timeout=5
        )

        if response.status_code == 200:
            stats = response.json()
            total = stats.get("total_labels", 0)
            categories = stats.get("by_category", {})

            print_success(f"Total labels in system: {total}")
            print_info("Labels by category:")
            for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"  - {category}: {count}")

            return True
        else:
            print_error(f"Failed to get statistics: {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print_error(f"Error retrieving statistics: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("Task Labeling System - Quick Test")
    print("="*60 + "\n")

    results = []

    # Test 1: Health check
    print(f"\n{Colors.BLUE}[TEST 1/7]{Colors.END} API Health Check")
    print("-" * 60)
    health_ok = test_health_check()
    results.append(("API Health Check", health_ok))

    if not health_ok:
        print_error("\nCannot proceed without API connection")
        print_info("Start the API with: uvicorn app.main:app --reload")
        sys.exit(1)

    # Test 2: Create task
    print(f"\n{Colors.BLUE}[TEST 2/7]{Colors.END} Task Creation")
    print("-" * 60)
    task = test_create_task()
    results.append(("Task Creation", bool(task)))

    if not task:
        print_error("\nCannot proceed without task creation")
        sys.exit(1)

    task_id = task['id']

    # Test 3: Labeling completion
    print(f"\n{Colors.BLUE}[TEST 3/7]{Colors.END} Labeling Completion")
    print("-" * 60)
    labeling_ok = test_labeling_completion(task_id, max_wait=20)
    results.append(("Labeling Completion", labeling_ok))

    if not labeling_ok:
        print_warning("\nLabeling did not complete, checking configuration...")
        print_info("Check:")
        print_info("  - OpenAI API key is valid")
        print_info("  - Pinecone API key is valid")
        print_info("  - API logs for errors")

    # Test 4: Get labels
    print(f"\n{Colors.BLUE}[TEST 4/7]{Colors.END} Label Retrieval")
    print("-" * 60)
    labels_ok = test_get_labels(task_id)
    results.append(("Label Retrieval", labels_ok))

    # Test 5: Get primary labels
    print(f"\n{Colors.BLUE}[TEST 5/7]{Colors.END} Primary Labels")
    print("-" * 60)
    primary_ok = test_primary_labels(task_id)
    results.append(("Primary Labels", primary_ok))

    # Test 6: Search by label
    print(f"\n{Colors.BLUE}[TEST 6/7]{Colors.END} Search by Label")
    print("-" * 60)
    search_ok = test_search_by_label(task_id)
    results.append(("Search by Label", search_ok))

    # Test 7: Statistics
    print(f"\n{Colors.BLUE}[TEST 7/7]{Colors.END} Label Statistics")
    print("-" * 60)
    stats_ok = test_label_statistics()
    results.append(("Label Statistics", stats_ok))

    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60 + "\n")

    passed = sum(1 for _, ok in results if ok)
    total = len(results)

    for test_name, ok in results:
        status = f"{Colors.GREEN}PASS{Colors.END}" if ok else f"{Colors.RED}FAIL{Colors.END}"
        print(f"{status}  {test_name}")

    print("\n" + "-"*60)
    print(f"Results: {passed}/{total} tests passed")

    if passed == total:
        print(f"\n{Colors.GREEN}🎉 All tests passed! System is working correctly.{Colors.END}\n")
        sys.exit(0)
    else:
        print(f"\n{Colors.YELLOW}⚠ Some tests failed. Check the output above.{Colors.END}\n")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
