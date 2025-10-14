/**
 * API calls for task recommendations
 */

import { apiService } from '../services/api';
import { RecommendationResponse } from '../types/Recommendation';

export const getRecommendations = async (
  message: string,
  topK: number = 3
): Promise<RecommendationResponse> => {
  // Use apiService which automatically includes auth headers
  // Increase timeout to 60 seconds for recommendations (OpenAI + Pinecone can be slow)
  const response = await (apiService as any).client.post('/recommendations/', {
    message: message,
  }, {
    params: {
      top_k: topK
    },
    timeout: 60000 // 60 seconds
  });

  return response.data;
};
