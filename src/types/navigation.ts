import { Todo } from './Todo';

// Serializable version of Todo for navigation params (dates as ISO strings)
export type SerializableTodo = Omit<Todo, 'createdAt' | 'deadline'> & {
  createdAt: string;
  deadline?: string;
};

export type TasksStackParamList = {
  TodoList: undefined;
  TaskDetail: {
    todo: SerializableTodo;
    onUpdate: (updatedTodo: Todo) => void;
    onDelete: (id: string) => void;
  };
};
