import { Todo } from './Todo';

export type TasksStackParamList = {
  TodoList: undefined;
  TaskDetail: {
    todo: Todo;
    onUpdate: (updatedTodo: Todo) => void;
    onDelete: (id: string) => void;
  };
};
