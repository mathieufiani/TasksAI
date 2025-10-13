import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TodoScreen } from '../screens/TodoScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { TasksStackParamList } from '../types/navigation';

const Stack = createStackNavigator<TasksStackParamList>();

export const TasksStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name="TodoList" component={TodoScreen} />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
};

export default TasksStackNavigator;
