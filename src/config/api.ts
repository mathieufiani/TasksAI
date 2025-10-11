/**
 * API Configuration
 * Configure the backend API endpoint
 */

import { Platform } from 'react-native';

// Production API URL - deployed on Google Cloud App Engine
const PRODUCTION_API_URL = 'https://tasksai-474818.uc.r.appspot.com';
const LOCAL_DEV_URL_IOS = 'http://192.168.3.142:8000';
const LOCAL_DEV_URL_ANDROID = 'http://10.0.2.2:8000';

// Check if running on a physical device by checking for localhost/simulator
const isPhysicalDevice = () => {
  // On physical devices, we can't reach localhost, so we use production
  // This is a simple heuristic: assume physical device in most cases
  return true;
};

const getBaseURL = () => {
  // For physical devices, always use production backend
  // For simulators/emulators in dev mode, use local backend
  if (__DEV__ && !isPhysicalDevice()) {
    // Development mode on simulator/emulator - local backend
    if (Platform.OS === 'ios') {
      return LOCAL_DEV_URL_IOS;
    } else if (Platform.OS === 'android') {
      return LOCAL_DEV_URL_ANDROID;
    }
  }
  // Production mode or physical device - use App Engine backend
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
