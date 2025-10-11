import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Priority } from '../types/Todo';
import { PrioritySelector } from './PrioritySelector';
import { DatePicker } from './DatePicker';

interface AddTodoInputProps {
  onAdd: (text: string, priority: Priority, deadline?: Date) => void;
}

export const AddTodoInput: React.FC<AddTodoInputProps> = ({ onAdd }) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [showOptions, setShowOptions] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(text.trim(), priority, deadline);
      setText('');
      setPriority('medium');
      setDeadline(undefined);
      setShowOptions(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isDarkMode ? styles.containerDark : styles.containerLight,
      ]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                isDarkMode ? styles.inputDark : styles.inputLight,
              ]}
              value={text}
              onChangeText={setText}
              placeholder="Add a new todo..."
              placeholderTextColor={isDarkMode ? '#8E8E93' : '#C7C7CC'}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => setShowOptions(!showOptions)}>
              <Text style={styles.optionsButtonText}>
                {showOptions ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, !text.trim() && styles.buttonDisabled]}
              onPress={handleAdd}
              disabled={!text.trim()}>
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>

          {showOptions && (
            <View style={styles.optionsContainer}>
              <Text
                style={[
                  styles.optionsLabel,
                  isDarkMode && styles.optionsLabelDark,
                ]}>
                Priority
              </Text>
              <PrioritySelector priority={priority} onSelect={setPriority} />

              <Text
                style={[
                  styles.optionsLabel,
                  isDarkMode && styles.optionsLabelDark,
                  styles.optionsLabelMargin,
                ]}>
                Deadline
              </Text>
              <DatePicker date={deadline} onSelect={setDeadline} />
            </View>
          )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  containerLight: {
    backgroundColor: '#F9F9F9',
  },
  containerDark: {
    backgroundColor: '#1C1C1E',
    borderTopColor: '#38383A',
  },
  inputContainer: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginRight: 8,
  },
  inputLight: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  inputDark: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
  },
  optionsButton: {
    width: 40,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  optionsButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
  optionsContainer: {
    marginTop: 16,
  },
  optionsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  optionsLabelDark: {
    color: '#98989D',
  },
  optionsLabelMargin: {
    marginTop: 16,
  },
});
