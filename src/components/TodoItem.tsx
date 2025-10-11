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
    switch (todo.priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return '#8E8E93';
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
    <View
      style={[
        styles.container,
        isDarkMode ? styles.containerDark : styles.containerLight,
      ]}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onToggle(todo.id)}>
        <View
          style={[
            styles.checkboxInner,
            { borderColor: getPriorityColor() },
            todo.completed && {
              backgroundColor: getPriorityColor(),
            },
          ]}>
          {todo.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Text
          style={[
            styles.text,
            isDarkMode ? styles.textDark : styles.textLight,
            todo.completed && styles.textCompleted,
          ]}>
          {todo.text}
        </Text>

        {todo.deadline && (
          <View style={styles.metaContainer}>
            <View
              style={[
                styles.deadlineBadge,
                isOverdue(todo.deadline) && styles.deadlineBadgeOverdue,
              ]}>
              <Text
                style={[
                  styles.deadlineText,
                  isOverdue(todo.deadline) && styles.deadlineTextOverdue,
                ]}>
                {formatDeadline(todo.deadline)}
              </Text>
            </View>
          </View>
        )}

        <LabelList
          labels={todo.labels}
          labelingStatus={todo.labelingStatus}
          maxVisible={4}
        />
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(todo.id)}>
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#2C2C2E',
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  text: {
    fontSize: 16,
    flexWrap: 'wrap',
  },
  textLight: {
    color: '#000000',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  metaContainer: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },
  deadlineBadge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deadlineBadgeOverdue: {
    backgroundColor: '#FFEBEE',
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C3C43',
  },
  deadlineTextOverdue: {
    color: '#FF3B30',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 32,
    fontWeight: '300',
  },
});
