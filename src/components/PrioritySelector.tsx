import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Priority } from '../types/Todo';

interface PrioritySelectorProps {
  priority: Priority;
  onSelect: (priority: Priority) => void;
}

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  priority,
  onSelect,
}) => {
  const isDarkMode = useColorScheme() === 'dark';

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: '#34C759' },
    { value: 'medium', label: 'Medium', color: '#FF9500' },
    { value: 'high', label: 'High', color: '#FF3B30' },
  ];

  return (
    <View style={styles.container}>
      {priorities.map(p => (
        <TouchableOpacity
          key={p.value}
          style={[
            styles.button,
            priority === p.value && styles.buttonSelected,
            priority === p.value && { backgroundColor: p.color },
          ]}
          onPress={() => onSelect(p.value)}>
          <Text
            style={[
              styles.buttonText,
              isDarkMode && !priority && styles.buttonTextDark,
              priority === p.value && styles.buttonTextSelected,
            ]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C3C43',
  },
  buttonTextDark: {
    color: '#FFFFFF',
  },
  buttonTextSelected: {
    color: '#FFFFFF',
  },
});
