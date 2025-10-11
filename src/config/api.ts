/**
 * API Configuration
 * Configure the backend API endpoint
 */

import { Platform } from 'react-native';

// Production API URL - deployed on Google Cloud App Engine
const PRODUCTION_API_URL = 'https://staging-543b455bc34613c8a8688306b92bbc64bdba19c3-dot-tasksai-474818.appspot.com';

// For iOS Simulator, use Mac's IP address
// For Android Emulator, use 10.0.2.2
// For physical devices on same network, use your computer's IP address
const getBaseURL = () => {
  if (__DEV__) {
    // Development mode - local backend
    if (Platform.OS === 'ios') {
      // Use Mac's IP address for iOS simulator
      return 'http://192.168.3.142:8000';
    } else if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }
  }
  // Production mode - use App Engine backend
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
