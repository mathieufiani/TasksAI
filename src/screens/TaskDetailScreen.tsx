import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Todo, Priority } from '../types/Todo';
import { SerializableTodo } from '../types/navigation';
import { LabelList } from '../components/LabelChip';
import { PrioritySelector } from '../components/PrioritySelector';
import { DatePicker } from '../components/DatePicker';
import colors from '../theme/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/styles';
import { apiService } from '../services/api';

interface TaskDetailScreenProps {
  route: {
    params: {
      todo: SerializableTodo;
      onUpdate: (updatedTodo: Todo) => void;
      onDelete: (id: string) => void;
    };
  };
  navigation: any;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { todo: serializableTodo, onUpdate, onDelete } = route.params;
  const safeAreaInsets = useSafeAreaInsets();

  // Deserialize dates from ISO strings to Date objects
  const initialTodo: Todo = useMemo(() => ({
    ...serializableTodo,
    createdAt: new Date(serializableTodo.createdAt),
    deadline: serializableTodo.deadline ? new Date(serializableTodo.deadline) : undefined,
  }), [serializableTodo]);

  const [todo, setTodo] = useState<Todo>(initialTodo);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(todo.text);
  const [editedDescription, setEditedDescription] = useState('');
  const [editedPriority, setEditedPriority] = useState<Priority>(todo.priority);
  const [editedDeadline, setEditedDeadline] = useState<Date | undefined>(todo.deadline);

  const handleSave = async () => {
    try {
      const updatedTask = await apiService.updateTask(Number(todo.id), {
        title: editedTitle,
        description: editedDescription,
        priority: apiService.priorityToBackend(editedPriority),
        due_date: editedDeadline?.toISOString(),
      });

      const updatedTodo: Todo = {
        ...todo,
        text: editedTitle,
        priority: editedPriority,
        deadline: editedDeadline,
      };

      setTodo(updatedTodo);
      onUpdate(updatedTodo);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };

  const handleToggleComplete = async () => {
    try {
      await apiService.updateTask(Number(todo.id), {
        completed: !todo.completed,
      });

      const updatedTodo = { ...todo, completed: !todo.completed };
      setTodo(updatedTodo);
      onUpdate(updatedTodo);
    } catch (error) {
      console.error('Failed to toggle task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteTask(Number(todo.id));
              onDelete(todo.id);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete task:', error);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteLabel = async (labelId: number) => {
    try {
      await apiService.deleteLabel(labelId);

      // Update local todo state by filtering out the deleted label
      const updatedLabels = todo.labels?.filter(label => label.id !== labelId) || [];
      const updatedTodo = { ...todo, labels: updatedLabels };

      setTodo(updatedTodo);
      onUpdate(updatedTodo);
    } catch (error) {
      console.error('Failed to delete label:', error);
      Alert.alert('Error', 'Failed to delete label. Please try again.');
    }
  };

  const getPriorityColor = () => {
    switch (todo.priority.toLowerCase()) {
      case 'high':
        return colors.priorityHigh;
      case 'medium':
        return colors.priorityMedium;
      case 'low':
        return colors.priorityLow;
      default:
        return colors.priorityNone;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeAreaInsets.top + spacing.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24 }}>⬅️</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={() => setIsEditing(false)}>
                <Text style={{ fontSize: 24 }}>❌</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
                <Text style={{ fontSize: 24 }}>✅</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={() => setIsEditing(true)}>
                <Text style={{ fontSize: 24 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
                <Text style={{ fontSize: 24 }}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Completion Status */}
        <TouchableOpacity
          style={styles.completionSection}
          onPress={handleToggleComplete}>
          <View style={styles.checkbox}>
            <Text style={{ fontSize: 32 }}>
              {todo.completed ? '⚫' : '⚪'}
            </Text>
          </View>
          <Text style={[styles.completionText, todo.completed && styles.completionTextCompleted]}>
            {todo.completed ? 'Completed' : 'Mark as complete'}
          </Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Task</Text>
          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={editedTitle}
              onChangeText={setEditedTitle}
              placeholder="Task title"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          ) : (
            <Text style={[styles.title, todo.completed && styles.titleCompleted]}>
              {todo.text}
            </Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          {isEditing ? (
            <TextInput
              style={styles.descriptionInput}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Add a description..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.description}>
              {editedDescription || 'No description added'}
            </Text>
          )}
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Priority</Text>
          {isEditing ? (
            <PrioritySelector
              priority={editedPriority}
              onSelect={setEditedPriority}
            />
          ) : (
            <View style={styles.infoRow}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
                <Text style={styles.priorityText}>
                  {todo.priority.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Deadline */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Due Date</Text>
          {isEditing ? (
            <DatePicker date={editedDeadline} onSelect={setEditedDeadline} />
          ) : todo.deadline ? (
            <View style={styles.infoRow}>
              <Text style={{ fontSize: 20 }}>📅</Text>
              <View style={styles.dateInfo}>
                <Text style={styles.infoText}>{formatDate(todo.deadline)}</Text>
                <Text style={styles.infoSubtext}>{formatTime(todo.deadline)}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No deadline set</Text>
          )}
        </View>

        {/* Labels */}
        {todo.labels && todo.labels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>AI Labels</Text>
            <LabelList
              labels={todo.labels}
              labelingStatus={todo.labelingStatus}
              maxVisible={isEditing ? undefined : 10}
              isEditable={isEditing}
              onDeleteLabel={handleDeleteLabel}
            />
          </View>
        )}

        {/* Creation Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Created</Text>
          <View style={styles.infoRow}>
            <Text style={{ fontSize: 20 }}>⏰</Text>
            <View style={styles.dateInfo}>
              <Text style={styles.infoText}>{formatDate(todo.createdAt)}</Text>
              <Text style={styles.infoSubtext}>{formatTime(todo.createdAt)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  completionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    marginRight: spacing.md,
  },
  completionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.textPrimary,
  },
  completionTextCompleted: {
    color: colors.success,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as any,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  titleInput: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  descriptionInput: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noDataText: {
    fontSize: fontSize.md,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateInfo: {
    flex: 1,
  },
  infoText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium as any,
    color: colors.textPrimary,
  },
  infoSubtext: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  priorityText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as any,
    color: colors.textOnPrimary,
  },
});
