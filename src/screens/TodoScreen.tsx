import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  useColorScheme,
  View,
  Text,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Todo, Priority } from '../types/Todo';
import { TodoList } from '../components/TodoList';
import { AddTodoInput } from '../components/AddTodoInput';
import { apiService, BackendTask } from '../services/api';

export const TodoScreen: React.FC = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
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

  return (
    <View
      style={[
        styles.container,
        isDarkMode ? styles.containerDark : styles.containerLight,
      ]}>
      <View style={[styles.header, { paddingTop: safeAreaInsets.top + 16 }]}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          My Todos
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          {activeCount} {activeCount === 1 ? 'task' : 'tasks'} remaining
        </Text>
      </View>

      <TodoList
        todos={todos}
        onToggle={handleToggleTodo}
        onDelete={handleDeleteTodo}
      />

      <AddTodoInput onAdd={handleAddTodo} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  subtitleDark: {
    color: '#636366',
  },
});
