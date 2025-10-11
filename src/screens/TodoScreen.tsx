import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Todo, Priority } from '../types/Todo';
import { TodoList } from '../components/TodoList';
import { AddTodoInput } from '../components/AddTodoInput';
import { apiService, BackendTask } from '../services/api';
import colors from '../theme/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/styles';

export const TodoScreen: React.FC = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  // Load tasks from backend on mount
  useEffect(() => {
    loadTasks();
  }, []);

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

  const loadTasks = async () => {
    try {
      setRefreshing(true);
      const backendTasks = await apiService.getTasks();

      // Load labels for each task
      const todosWithLabels = await Promise.all(
        backendTasks.map(async (task) => {
          const labels = await apiService.getTaskLabels(task.id);
          return backendTaskToTodo(task, labels);
        })
      );

      setTodos(todosWithLabels);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the backend. Make sure the server is running on http://192.168.3.142:8000',
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddTodo = async (text: string, priority: Priority, deadline?: Date) => {
    try {
      const newTask = await apiService.createTask({
        title: text,
        description: '',
        priority: apiService.priorityToBackend(priority),
        due_date: deadline?.toISOString(),
      });

      // Add task with pending status - polling will update it automatically
      const newTodo = backendTaskToTodo(newTask, []);
      setTodos([newTodo, ...todos]);

      // Show success message with AI labeling info
      Alert.alert(
        'Task Created!',
        'AI is analyzing your task and generating smart labels. They will appear automatically when ready.',
      );
    } catch (error) {
      console.error('Failed to create task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  };

  const handleToggleTodo = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      const updatedTask = await apiService.updateTask(Number(id), {
        completed: !todo.completed,
      });

      setTodos(
        todos.map(t =>
          t.id === id ? { ...t, completed: !t.completed } : t,
        ),
      );
    } catch (error) {
      console.error('Failed to update task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await apiService.deleteTask(Number(id));
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
      Alert.alert('Error', 'Failed to delete task. Please try again.');
    }
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
      <View style={[styles.header, { paddingTop: safeAreaInsets.top + spacing.md }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>
              ✨ My Tasks
            </Text>
            <Text style={styles.subtitle}>
              {activeCount} {activeCount === 1 ? 'task' : 'tasks'} to conquer!
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressText}>
              {completedCount}/{totalCount}
            </Text>
          </View>
        </View>

        {totalCount > 0 && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress * 100}%` }
              ]}
            />
          </View>
        )}
      </View>

      <TodoList
        todos={todos}
        onToggle={handleToggleTodo}
        onDelete={handleDeleteTodo}
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
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extrabold as any,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium as any,
    color: colors.textSecondary,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  progressText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as any,
    color: colors.primary,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.round,
  },
});
