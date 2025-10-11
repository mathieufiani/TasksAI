/**
 * API calls for task recommendations
 */

import { API_CONFIG } from '../config/api';
import { RecommendationResponse } from '../types/Recommendation';

export const getRecommendations = async (
  message: string,
  topK: number = 3
): Promise<RecommendationResponse> => {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}/recommendations/`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get recommendations: ${response.status}`);
  }

  return response.json();
};
