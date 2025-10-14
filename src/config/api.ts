/**
 * API Configuration
 * Configure the backend API endpoint
 */

import { Platform } from 'react-native';

// Production API URL - deployed on Google Cloud App Engine
const PRODUCTION_API_URL = 'https://tasksai-474818.appspot.com';
const LOCAL_DEV_URL_IOS = 'http://localhost:8000';
const LOCAL_DEV_URL_ANDROID = 'http://10.0.2.2:8000';

const getBaseURL = () => {
  // For local development: Uncomment the lines below to use localhost
  // if (Platform.OS === 'ios') {
  //   return LOCAL_DEV_URL_IOS;
  // }

  // Use production backend by default
  return PRODUCTION_API_URL;
};

export const API_CONFIG = {
  BASE_URL: getBaseURL(),
  API_VERSION: '/api/v1',
  TIMEOUT: 10000, // 10 seconds
};

export const API_ENDPOINTS = {
  TASKS: '/tasks/',
  LABELS: '/labels/',
  TASK_LABELS: (taskId: string) => `/labels/task/${taskId}`,
  LABEL_STATUS: (taskId: string) => `/labels/task/${taskId}/status`,
};

// Export API_URL for backward compatibility
export const API_URL = API_CONFIG.BASE_URL;
