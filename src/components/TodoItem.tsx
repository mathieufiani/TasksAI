import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
import { Todo } from '../types/Todo';
import { LabelList } from './LabelChip';
import colors from '../theme/colors';
import { spacing, borderRadius, fontSize, fontWeight } from '../theme/styles';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggle,
  onDelete,
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
        return 'alert-circle';
      case 'medium':
        return 'warning';
      case 'low':
        return 'checkmark-circle';
      default:
        return 'radio-button-off';
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
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => onToggle(todo.id)}>
          <Icon
            name={todo.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={todo.completed ? colors.success : colors.border}
          />
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
          <Icon
            name={getPriorityIcon()}
            size={16}
            color={getPriorityColor()}
            style={styles.priorityIcon}
          />
        </View>

        <View style={styles.metaRow}>
          {todo.deadline && (
            <View
              style={[
                styles.deadlineBadge,
                isOverdue(todo.deadline) && styles.deadlineBadgeOverdue,
              ]}>
              <Icon
                name="calendar-outline"
                size={12}
                color={isOverdue(todo.deadline) ? colors.danger : colors.textTertiary}
              />
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
        onPress={() => onDelete(todo.id)}>
        <Icon name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
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
