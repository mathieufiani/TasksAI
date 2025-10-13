import React from 'react';
import { FlatList, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Todo } from '../types/Todo';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPress?: (todo: Todo) => void;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  onToggle,
  onDelete,
  onPress,
}) => {
  const isDarkMode = useColorScheme() === 'dark';

  const sortTodos = (todoList: Todo[]) => {
    return [...todoList].sort((a, b) => {
      // First, sort by completion status (incomplete first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Then by priority (high > medium > low)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Then by deadline (earlier dates first)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;

      // Finally by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  if (todos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
          No todos yet. Add one to get started!
        </Text>
      </View>
    );
  }

  const sortedTodos = sortTodos(todos);

  return (
    <FlatList
      data={sortedTodos}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TodoItem todo={item} onToggle={onToggle} onDelete={onDelete} onPress={onPress} />
      )}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#636366',
  },
});
