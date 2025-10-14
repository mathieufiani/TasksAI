import { Todo } from './Todo';

// Serializable version of Todo for navigation params (dates as ISO strings)
export type SerializableTodo = Omit<Todo, 'createdAt' | 'deadline'> & {
  createdAt: string;
  deadline?: string;
};

// Auth Stack Navigation Types
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

// Main App Stack Navigation Types
export type TasksStackParamList = {
  TodoList: undefined;
  TaskDetail: {
    todo: SerializableTodo;
    onUpdate: (updatedTodo: Todo) => void;
    onDelete: (id: string) => void;
  };
};

// Root Stack Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
