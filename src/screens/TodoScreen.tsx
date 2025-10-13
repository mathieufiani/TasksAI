import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import NetInfo from '@react-native-community/netinfo';
import { Todo, Priority } from '../types/Todo';
import { TodoList } from '../components/TodoList';
import { AddTodoInput } from '../components/AddTodoInput';
import { apiService, BackendTask } from '../services/api';
import { taskCacheManager } from '../services/TaskCacheManager';
import colors from '../theme/colors';
import { spacing, borderRadius, fontSize, fontWeight} from '../theme/styles';
import { TasksStackParamList } from '../types/navigation';

type TodoScreenNavigationProp = StackNavigationProp<TasksStackParamList, 'TodoList'>;

export const TodoScreen: React.FC = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const navigation = useNavigation<TodoScreenNavigationProp>();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const hasMountedRef = useRef(false);

  // Convert backend task to frontend Todo format
  const backendTaskToTodo = (task: BackendTask, labels?: any[]): Todo => ({
    id: task.id.toString(),
    text: task.title,
    completed: task.completed,
    createdAt: new Date(task.created_at),
    priority: apiService.priorityToFrontend(task.priority),
    deadline: task.due_date ? new Date(task.due_date) : undefined,
    labelingStatus: task.labeling_status,
    labels: labels,
  });

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const isNowOnline = state.isConnected ?? false;
      setIsOnline(isNowOnline);

      // If just came back online, process offline queue
      if (wasOffline && isNowOnline) {
        console.log('[Network] Back online, processing offline queue');
        processOfflineQueue();
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  // Load tasks on mount - cache-first strategy
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      loadTasksCacheFirst();
    }
  }, []);

  // Reload tasks when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (hasMountedRef.current) {
        // Silent refresh in background
        loadTasksFromBackend(false);
      }
    }, [])
  );

  // Poll for label updates for tasks with pending/in_progress status
  useEffect(() => {
    const pollForLabelUpdates = async () => {
      // Find tasks that are still being labeled
      const tasksBeingLabeled = todos.filter(
        t => t.labelingStatus === 'pending' || t.labelingStatus === 'in_progress'
      );

      if (tasksBeingLabeled.length === 0) {
        return; // No tasks being labeled, skip polling
      }

      // Check each task for label updates
      for (const task of tasksBeingLabeled) {
        try {
          const taskData = await apiService.getTask(Number(task.id));

          // If status changed, update the task
          if (taskData.labeling_status !== task.labelingStatus) {
            const labels = await apiService.getTaskLabels(Number(task.id));

            setTodos(prevTodos =>
              prevTodos.map(t =>
                t.id === task.id
                  ? { ...t, labels, labelingStatus: taskData.labeling_status }
                  : t
              )
            );
          }
        } catch (error) {
          console.log('Error polling labels for task', task.id, error);
        }
      }
    };

    // Poll every 3 seconds if there are tasks being labeled
    const hasPendingTasks = todos.some(
      t => t.labelingStatus === 'pending' || t.labelingStatus === 'in_progress'
    );

    if (hasPendingTasks) {
      const interval = setInterval(pollForLabelUpdates, 3000);
      return () => clearInterval(interval);
    }
  }, [todos]);

  /**
   * Load tasks using cache-first strategy (Option C)
   * Show cached data immediately, then silently refresh from backend
   */
  const loadTasksCacheFirst = async () => {
    try {
      // First, load from cache
      const cachedTasks = await taskCacheManager.getCachedTasks();
      if (cachedTasks && cachedTasks.length > 0) {
        console.log('[TodoScreen] Loaded tasks from cache');
        setTodos(cachedTasks);
      }

      // Then, silently refresh from backend in background
      await loadTasksFromBackend(false);
    } catch (error) {
      console.error('[TodoScreen] Error in cache-first load:', error);
      // If cache fails, try loading from backend with loading indicator
      await loadTasksFromBackend(true);
    }
  };

  /**
   * Load tasks from backend and update cache
   * @param showLoading - Whether to show loading indicator
   */
  const loadTasksFromBackend = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setRefreshing(true);
      }

      if (!isOnline) {
        console.log('[TodoScreen] Offline, skipping backend load');
        return;
      }

      const backendTasks = await apiService.getTasks();

      // Load labels for each task
      const todosWithLabels = await Promise.all(
        backendTasks.map(async (task) => {
          const labels = await apiService.getTaskLabels(task.id);
          return backendTaskToTodo(task, labels);
        })
      );

      // Update UI
      setTodos(todosWithLabels);

      // Update cache
      await taskCacheManager.saveTasks(todosWithLabels);
      console.log('[TodoScreen] Tasks loaded from backend and cached');
    } catch (error) {
      console.error('[TodoScreen] Failed to load tasks from backend:', error);

      // Only show error if we don't have cached data
      const cachedTasks = await taskCacheManager.getCachedTasks();
      if (!cachedTasks || cachedTasks.length === 0) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the backend. Please check your internet connection.',
        );
      }
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  };

  /**
   * Process offline queue when coming back online
   */
  const processOfflineQueue = async () => {
    try {
      const queue = await taskCacheManager.getOfflineQueue();

      if (queue.length === 0) {
        console.log('[TodoScreen] No offline operations to process');
        return;
      }

      console.log('[TodoScreen] Processing', queue.length, 'offline operations');

      for (const operation of queue) {
        try {
          switch (operation.type) {
            case 'create':
              await apiService.createTask(operation.data);
              break;
            case 'update':
              await apiService.updateTask(operation.data.id, operation.data.updates);
              break;
            case 'delete':
              await apiService.deleteTask(operation.data.id);
              break;
          }

          // Remove from queue after successful sync
          await taskCacheManager.removeFromOfflineQueue(operation.id);
          console.log('[TodoScreen] Processed offline operation:', operation.type);
        } catch (error) {
          console.error('[TodoScreen] Failed to process offline operation:', operation.type, error);
          // Keep in queue to retry later
        }
      }

      // Refresh tasks after processing queue
      await loadTasksFromBackend(false);
    } catch (error) {
      console.error('[TodoScreen] Error processing offline queue:', error);
    }
  };

  /**
   * Handle pull-to-refresh
   * Invalidates cache and force-loads from backend
   */
  const handleRefresh = async () => {
    console.log('[TodoScreen] Pull-to-refresh triggered');
    await taskCacheManager.invalidateCache();
    await loadTasksFromBackend(true);
  };

  const handleAddTodo = async (text: string, priority: Priority, deadline?: Date) => {
    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticTodo: Todo = {
      id: tempId,
      text,
      completed: false,
      createdAt: new Date(),
      priority,
      deadline,
      labelingStatus: 'pending',
      labels: [],
    };

    try {
      // Optimistic update - show immediately
      setTodos([optimisticTodo, ...todos]);
      await taskCacheManager.addTaskToCache(optimisticTodo);

      // Sync with backend
      if (isOnline) {
        const newTask = await apiService.createTask({
          title: text,
          description: '',
          priority: apiService.priorityToBackend(priority),
          due_date: deadline?.toISOString(),
        });

        // Replace temp task with real task from backend
        const realTodo = backendTaskToTodo(newTask, []);
        setTodos(prevTodos =>
          prevTodos.map(t => (t.id === tempId ? realTodo : t))
        );

        // Update cache with real task
        await taskCacheManager.removeTaskFromCache(tempId);
        await taskCacheManager.addTaskToCache(realTodo);

        console.log('[TodoScreen] Task created and synced with backend');
      } else {
        // Queue for later if offline
        await taskCacheManager.addToOfflineQueue({
          type: 'create',
          data: {
            title: text,
            description: '',
            priority: apiService.priorityToBackend(priority),
            due_date: deadline?.toISOString(),
          },
        });
        console.log('[TodoScreen] Task queued for offline sync');
      }
    } catch (error) {
      console.error('[TodoScreen] Failed to create task:', error);

      // Revert optimistic update on error
      setTodos(prevTodos => prevTodos.filter(t => t.id !== tempId));
      await taskCacheManager.removeTaskFromCache(tempId);

      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  };

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newCompletedState = !todo.completed;

    try {
      // Optimistic update - toggle immediately
      setTodos(prevTodos =>
        prevTodos.map(t =>
          t.id === id ? { ...t, completed: newCompletedState } : t
        )
      );
      await taskCacheManager.updateTaskInCache(id, { completed: newCompletedState });

      // Sync with backend
      if (isOnline) {
        await apiService.updateTask(Number(id), {
          completed: newCompletedState,
        });
        console.log('[TodoScreen] Task toggle synced with backend');
      } else {
        // Queue for later if offline
        await taskCacheManager.addToOfflineQueue({
          type: 'update',
          data: {
            id: Number(id),
            updates: { completed: newCompletedState },
          },
        });
        console.log('[TodoScreen] Task toggle queued for offline sync');
      }
    } catch (error) {
      console.error('[TodoScreen] Failed to toggle task:', error);

      // Revert optimistic update on error
      setTodos(prevTodos =>
        prevTodos.map(t =>
          t.id === id ? { ...t, completed: !newCompletedState } : t
        )
      );
      await taskCacheManager.updateTaskInCache(id, { completed: !newCompletedState });

      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    const deletedTodo = todos.find(t => t.id === id);
    if (!deletedTodo) return;

    try {
      // Optimistic update - remove immediately
      setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
      await taskCacheManager.removeTaskFromCache(id);

      // Sync with backend
      if (isOnline) {
        await apiService.deleteTask(Number(id));
        console.log('[TodoScreen] Task deletion synced with backend');
      } else {
        // Queue for later if offline
        await taskCacheManager.addToOfflineQueue({
          type: 'delete',
          data: { id: Number(id) },
        });
        console.log('[TodoScreen] Task deletion queued for offline sync');
      }
    } catch (error) {
      console.error('[TodoScreen] Failed to delete task:', error);

      // Revert optimistic update on error
      setTodos(prevTodos => [...prevTodos, deletedTodo]);
      await taskCacheManager.addTaskToCache(deletedTodo);

      Alert.alert('Error', 'Failed to delete task. Please try again.');
    }
  };

  const handleTodoPress = (todo: Todo) => {
    // Serialize dates to ISO strings for navigation
    const serializableTodo = {
      ...todo,
      createdAt: todo.createdAt.toISOString(),
      deadline: todo.deadline?.toISOString(),
    };

    navigation.navigate('TaskDetail', {
      todo: serializableTodo,
      onUpdate: (updatedTodo: Todo) => {
        setTodos(prevTodos =>
          prevTodos.map(t => t.id === updatedTodo.id ? updatedTodo : t)
        );
      },
      onDelete: (id: string) => {
        setTodos(prevTodos => prevTodos.filter(t => t.id !== id));
      },
    });
  };

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: safeAreaInsets.top + spacing.lg }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={{ fontSize: 32 }}>✅</Text>
              <Text style={styles.title}>Tasks</Text>
            </View>
            <Text style={styles.subtitle}>
              {activeCount} active • {completedCount} completed
            </Text>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={{ fontSize: 18 }}>🏆</Text>
              <Text style={styles.statValue}>{completedCount}</Text>
            </View>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>

        {totalCount > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${progress * 100}%` }
                ]}
              />
            </View>
          </View>
        )}
      </View>

      <TodoList
        todos={todos}
        onToggle={handleToggleTodo}
        onDelete={handleDeleteTodo}
        onPress={handleTodoPress}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <AddTodoInput onAdd={handleAddTodo} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold as any,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
    color: colors.textSecondary,
  },
  statsCard: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: 70,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as any,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as any,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginTop: spacing.sm,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.textSecondary,
  },
  progressPercent: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as any,
    color: colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },
});
