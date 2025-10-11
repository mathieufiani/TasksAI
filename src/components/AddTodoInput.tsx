import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from '@react-native-vector-icons/ionicons';
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
          <View style={styles.inputWrapper}>
            <Icon
              name="add-circle-outline"
              size={20}
              color={colors.textTertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Add a new task..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => setShowOptions(!showOptions)}>
            <Icon
              name={showOptions ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !text.trim() && styles.buttonDisabled]}
            onPress={handleAdd}
            disabled={!text.trim()}>
            <Icon
              name="arrow-up"
              size={24}
              color={colors.textOnPrimary}
            />
          </TouchableOpacity>
        </View>

        {showOptions && (
          <View style={styles.optionsContainer}>
            <View style={styles.optionSection}>
              <View style={styles.optionHeader}>
                <Icon name="flag-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.optionsLabel}>Priority</Text>
              </View>
              <PrioritySelector priority={priority} onSelect={setPriority} />
            </View>

            <View style={styles.optionSection}>
              <View style={styles.optionHeader}>
                <Icon name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.optionsLabel}>Deadline</Text>
              </View>
              <DatePicker date={deadline} onSelect={setDeadline} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputContainer: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium as any,
  },
  optionsButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  optionsContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  optionSection: {
    gap: spacing.sm,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionsLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
