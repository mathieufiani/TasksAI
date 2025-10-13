import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Todo } from '../types/Todo';
import { LabelList } from './LabelChip';
import colors from '../theme/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/styles';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPress?: (todo: Todo) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggle,
  onDelete,
  onPress,
}) => {
  const isDarkMode = useColorScheme() === 'dark';

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

  const getPriorityIcon = () => {
    switch (todo.priority.toLowerCase()) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const formatDeadline = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const isOverdue = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today && !todo.completed;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(todo)}
      activeOpacity={0.7}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={(e) => {
            e.stopPropagation();
            onToggle(todo.id);
          }}>
          <Text style={{ fontSize: 28 }}>
            {todo.completed ? '⚫' : '⚪'}
          </Text>
        </TouchableOpacity>

        <View style={[
          styles.priorityIndicator,
          { backgroundColor: getPriorityColor() }
        ]} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.textRow}>
          <Text
            style={[
              styles.text,
              todo.completed && styles.textCompleted,
            ]}>
            {todo.text}
          </Text>
          <Text style={styles.priorityIcon}>
            {getPriorityIcon()}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {todo.deadline && (
            <View
              style={[
                styles.deadlineBadge,
                isOverdue(todo.deadline) && styles.deadlineBadgeOverdue,
              ]}>
              <Text style={{ fontSize: 12 }}>📅</Text>
              <Text
                style={[
                  styles.deadlineText,
                  isOverdue(todo.deadline) && styles.deadlineTextOverdue,
                ]}>
                {formatDeadline(todo.deadline)}
              </Text>
            </View>
          )}
        </View>

        <LabelList
          labels={todo.labels}
          labelingStatus={todo.labelingStatus}
          maxVisible={4}
        />
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}>
        <Text style={{ fontSize: 20 }}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checkbox: {
    marginRight: spacing.xs,
  },
  priorityIndicator: {
    width: 3,
    height: 28,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  text: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium as any,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  priorityIcon: {
    marginLeft: spacing.xs,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  deadlineBadgeOverdue: {
    backgroundColor: colors.dangerLight,
  },
  deadlineText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as any,
    color: colors.textSecondary,
  },
  deadlineTextOverdue: {
    color: colors.danger,
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
