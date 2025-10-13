/**
 * Task Cache Manager
 * Manages persistent task caching with AsyncStorage
 * Implements cache invalidation strategies:
 * - After CRUD operations
 * - After 30 minutes of inactivity
 * - On pull-to-refresh
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Todo } from '../types/Todo';

const CACHE_KEY = '@tasks_cache';
const CACHE_TIMESTAMP_KEY = '@tasks_cache_timestamp';
const OFFLINE_QUEUE_KEY = '@offline_queue';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: number;
  data: any;
}

class TaskCacheManager {
  /**
   * Get cached tasks
   * Returns null if cache is empty or expired
   */
  async getCachedTasks(): Promise<Todo[] | null> {
    try {
      const [cachedData, timestamp] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_TIMESTAMP_KEY),
      ]);

      if (!cachedData || !timestamp) {
        return null;
      }

      const cacheAge = Date.now() - parseInt(timestamp, 10);
      if (cacheAge > CACHE_EXPIRY_MS) {
        console.log('[Cache] Cache expired, age:', Math.round(cacheAge / 1000 / 60), 'minutes');
        return null;
      }

      const tasks: Todo[] = JSON.parse(cachedData);
      console.log('[Cache] Retrieved', tasks.length, 'tasks from cache');
      return tasks;
    } catch (error) {
      console.error('[Cache] Error reading cache:', error);
      return null;
    }
  }

  /**
   * Save tasks to cache
   */
  async saveTasks(tasks: Todo[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(tasks)),
        AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString()),
      ]);
      console.log('[Cache] Saved', tasks.length, 'tasks to cache');
    } catch (error) {
      console.error('[Cache] Error saving cache:', error);
    }
  }

  /**
   * Invalidate cache (clear it)
   */
  async invalidateCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEY),
        AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY),
      ]);
      console.log('[Cache] Cache invalidated');
    } catch (error) {
      console.error('[Cache] Error invalidating cache:', error);
    }
  }

  /**
   * Update a single task in cache (optimistic update)
   */
  async updateTaskInCache(taskId: string, updates: Partial<Todo>): Promise<void> {
    try {
      const cachedTasks = await this.getCachedTasks();
      if (!cachedTasks) return;

      const updatedTasks = cachedTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );

      await this.saveTasks(updatedTasks);
      console.log('[Cache] Updated task', taskId, 'in cache');
    } catch (error) {
      console.error('[Cache] Error updating task in cache:', error);
    }
  }

  /**
   * Add a new task to cache (optimistic update)
   */
  async addTaskToCache(task: Todo): Promise<void> {
    try {
      const cachedTasks = await this.getCachedTasks();
      const updatedTasks = cachedTasks ? [task, ...cachedTasks] : [task];

      await this.saveTasks(updatedTasks);
      console.log('[Cache] Added task', task.id, 'to cache');
    } catch (error) {
      console.error('[Cache] Error adding task to cache:', error);
    }
  }

  /**
   * Remove a task from cache (optimistic update)
   */
  async removeTaskFromCache(taskId: string): Promise<void> {
    try {
      const cachedTasks = await this.getCachedTasks();
      if (!cachedTasks) return;

      const updatedTasks = cachedTasks.filter(task => task.id !== taskId);

      await this.saveTasks(updatedTasks);
      console.log('[Cache] Removed task', taskId, 'from cache');
    } catch (error) {
      console.error('[Cache] Error removing task from cache:', error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  async isCacheValid(): Promise<boolean> {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;

      const cacheAge = Date.now() - parseInt(timestamp, 10);
      return cacheAge <= CACHE_EXPIRY_MS;
    } catch (error) {
      console.error('[Cache] Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Get offline queue
   */
  async getOfflineQueue(): Promise<OfflineOperation[]> {
    try {
      const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueData) return [];

      return JSON.parse(queueData);
    } catch (error) {
      console.error('[Cache] Error reading offline queue:', error);
      return [];
    }
  }

  /**
   * Add operation to offline queue
   */
  async addToOfflineQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const newOperation: OfflineOperation = {
        ...operation,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      queue.push(newOperation);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log('[Cache] Added operation to offline queue:', operation.type);
    } catch (error) {
      console.error('[Cache] Error adding to offline queue:', error);
    }
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      console.log('[Cache] Offline queue cleared');
    } catch (error) {
      console.error('[Cache] Error clearing offline queue:', error);
    }
  }

  /**
   * Remove specific operation from queue
   */
  async removeFromOfflineQueue(operationId: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const updatedQueue = queue.filter(op => op.id !== operationId);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
      console.log('[Cache] Removed operation from offline queue:', operationId);
    } catch (error) {
      console.error('[Cache] Error removing from offline queue:', error);
    }
  }
}

// Export singleton instance
export const taskCacheManager = new TaskCacheManager();
