/**
 * API Service
 * Handles all communication with the backend API
 */

import axios, { AxiosInstance } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { Priority } from '../types/Todo';

// Backend Task interface (matches FastAPI schema)
export interface BackendTask {
  id: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  due_date?: string;
  created_at: string;
  updated_at: string;
  labeling_status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  due_date?: string;
}

export interface Label {
  id: number;
  task_id: number;
  label_name: string;
  label_category: string;
  confidence_score: number;
  reasoning?: string;
  created_at: string;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      config => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      response => {
        console.log(`[API] Response:`, response.status, response.data);
        return response;
      },
      error => {
        console.error('[API] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Task operations
  async getTasks(): Promise<BackendTask[]> {
    const response = await this.client.get<{ tasks: BackendTask[] }>(API_ENDPOINTS.TASKS);
    return response.data.tasks;
  }

  async getTask(id: number): Promise<BackendTask> {
    const response = await this.client.get<BackendTask>(`${API_ENDPOINTS.TASKS}${id}`);
    return response.data;
  }

  async createTask(task: CreateTaskRequest): Promise<BackendTask> {
    const response = await this.client.post<BackendTask>(API_ENDPOINTS.TASKS, task);
    return response.data;
  }

  async updateTask(id: number, updates: UpdateTaskRequest): Promise<BackendTask> {
    const response = await this.client.put<BackendTask>(`${API_ENDPOINTS.TASKS}${id}`, updates);
    return response.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.client.delete(`${API_ENDPOINTS.TASKS}${id}`);
  }

  // Label operations
  async getTaskLabels(taskId: number): Promise<Label[]> {
    try {
      const response = await this.client.get<Label[]>(API_ENDPOINTS.TASK_LABELS(taskId.toString()));
      // Filter out labels with confidence score below 70%
      const highConfidenceLabels = response.data.filter(label => label.confidence_score >= 0.7);
      return highConfidenceLabels;
    } catch (error) {
      // If labels don't exist yet, return empty array
      console.log(`[API] No labels found for task ${taskId}`);
      return [];
    }
  }

  async getLabelingStatus(taskId: number): Promise<{ status: string; message?: string }> {
    const response = await this.client.get(API_ENDPOINTS.LABEL_STATUS(taskId.toString()));
    return response.data;
  }

  // Fetch task with labels
  async getTaskWithLabels(taskId: number): Promise<BackendTask & { labels: Label[] }> {
    const [task, labels] = await Promise.all([
      this.getTask(taskId),
      this.getTaskLabels(taskId)
    ]);
    return { ...task, labels };
  }

  // Helper to convert frontend Priority to backend priority
  priorityToBackend(priority: Priority): 'low' | 'medium' | 'high' {
    return priority.toLowerCase() as 'low' | 'medium' | 'high';
  }

  // Helper to convert backend priority to frontend Priority
  priorityToFrontend(priority: string): Priority {
    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase() as Priority;
  }
}

// Export singleton instance
export const apiService = new ApiService();
