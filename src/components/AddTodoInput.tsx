import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Priority } from '../types/Todo';
import { PrioritySelector } from './PrioritySelector';
import { DatePicker } from './DatePicker';
import colors from '../theme/colors';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../theme/styles';

interface AddTodoInputProps {
  onAdd: (text: string, priority: Priority, deadline?: Date) => void;
}

export const AddTodoInput: React.FC<AddTodoInputProps> = ({ onAdd }) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [showOptions, setShowOptions] = useState(false);

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
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="✏️ Add a new task..."
            placeholderTextColor={colors.textSecondary}
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
            <Text style={styles.optionsLabel}>
              Priority
            </Text>
            <PrioritySelector priority={priority} onSelect={setPriority} />

            <Text style={[styles.optionsLabel, styles.optionsLabelMargin]}>
              Deadline
            </Text>
            <DatePicker date={deadline} onSelect={setDeadline} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.large,
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
    height: 56,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    fontWeight: fontWeight.medium as any,
  },
  optionsButton: {
    width: 44,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  optionsButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.bold as any,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 32,
    fontWeight: fontWeight.normal as any,
  },
  optionsContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
  },
  optionsLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as any,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsLabelMargin: {
    marginTop: spacing.md,
  },
});
