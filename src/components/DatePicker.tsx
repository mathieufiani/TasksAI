import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ date, onSelect }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(date || new Date());

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onSelect(selectedDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    onSelect(tempDate);
    setShowPicker(false);
  };

  const handleClear = () => {
    onSelect(undefined);
    setShowPicker(false);
  };

  const formatDate = (d: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isDarkMode ? styles.buttonDark : styles.buttonLight,
          date && styles.buttonSelected,
        ]}
        onPress={() => setShowPicker(true)}>
        <Text
          style={[
            styles.buttonText,
            isDarkMode && styles.buttonTextDark,
            date && styles.buttonTextSelected,
          ]}>
          {date ? formatDate(date) : 'Set deadline'}
        </Text>
      </TouchableOpacity>

      {showPicker && Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                isDarkMode ? styles.modalContentDark : styles.modalContentLight,
              ]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleClear}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.modalTitle,
                    isDarkMode && styles.modalTitleDark,
                  ]}>
                  Set Deadline
                </Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.confirmButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                textColor={isDarkMode ? '#FFFFFF' : '#000000'}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonLight: {
    backgroundColor: '#E5E5EA',
  },
  buttonDark: {
    backgroundColor: '#2C2C2E',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalContentLight: {
    backgroundColor: '#FFFFFF',
  },
  modalContentDark: {
    backgroundColor: '#1C1C1E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  modalTitleDark: {
    color: '#FFFFFF',
  },
  clearButton: {
    fontSize: 17,
    color: '#FF3B30',
  },
  confirmButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
