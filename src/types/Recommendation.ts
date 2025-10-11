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

export interface RecommendationResponse {
  user_context: ExtractedContext;
  recommendations: TaskRecommendation[];
  message: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  recommendations?: TaskRecommendation[];
  timestamp: Date;
}
