/**
 * Types for task recommendation feature
 */

export interface ExtractedContext {
  location: string | null;
  time_of_day: string | null;
  energy_level: string | null;
  mood: string | null;
  duration_available: string | null;
  other_labels: string[];
}

export interface TaskRecommendation {
  task_id: number;
  title: string;
  description: string | null;
  priority: string;
  match_score: number;
  matching_labels: string[];
  reasoning: string;
}

export interface TaskSuggestion {
  title: string;
  description: string | null;
  suggested_priority: string;
  suggested_due_date: string | null;
  suggested_labels: string[];
  reasoning: string;
}

export interface RecommendationResponse {
  user_context: ExtractedContext;
  recommendations: TaskRecommendation[];
  suggestions: TaskSuggestion[];
  message: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  recommendations?: TaskRecommendation[];
  suggestions?: TaskSuggestion[];
  timestamp: Date;
}
