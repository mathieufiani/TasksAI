export type Priority = 'low' | 'medium' | 'high';

export type LabelingStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Label {
  id: number;
  label_name: string;
  label_category: string;
  confidence_score: number;
  reasoning?: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  deadline?: Date;
  priority: Priority;
  labelingStatus?: LabelingStatus;
  labels?: Label[];
}

export type TodoFilter = 'all' | 'active' | 'completed';
