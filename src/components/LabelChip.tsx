import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { Label, LabelingStatus } from '../types/Todo';

interface LabelChipProps {
  label?: Label;
  status?: LabelingStatus;
  isPending?: boolean;
}

// Color mapping for label categories
const getCategoryColor = (category: string, isDark: boolean) => {
  const colors = {
    location: isDark ? '#FF9500' : '#FF9500',
    time: isDark ? '#5AC8FA' : '#007AFF',
    energy: isDark ? '#FF2D55' : '#FF3B30',
    duration: isDark ? '#AF52DE' : '#AF52DE',
    mood: isDark ? '#FF2D55' : '#FF2D55',
    category: isDark ? '#32D74B' : '#34C759',
    prerequisites: isDark ? '#FFD60A' : '#FFCC00',
    context: isDark ? '#64D2FF' : '#5AC8FA',
    tools: isDark ? '#BF5AF2' : '#AF52DE',
    people: isDark ? '#FF375F' : '#FF2D55',
    weather: isDark ? '#5E5CE6' : '#5856D6',
    default: isDark ? '#8E8E93' : '#8E8E93',
  };
  return colors[category as keyof typeof colors] || colors.default;
};

export const LabelChip: React.FC<LabelChipProps> = ({ label, status, isPending }) => {
  const isDarkMode = useColorScheme() === 'dark';

  // Show "pending" label if labeling is in progress
  if (isPending || status === 'pending' || status === 'in_progress') {
    return (
      <View style={[styles.chip, styles.pendingChip, isDarkMode && styles.pendingChipDark]}>
        <ActivityIndicator size="small" color={isDarkMode ? '#AEAEB2' : '#8E8E93'} />
        <Text style={[styles.chipText, styles.pendingText]}>
          {status === 'in_progress' ? 'labeling...' : 'pending'}
        </Text>
      </View>
    );
  }

  // Show failed status
  if (status === 'failed') {
    return (
      <View style={[styles.chip, styles.failedChip]}>
        <Text style={[styles.chipText, styles.failedText]}>❌ failed</Text>
      </View>
    );
  }

  // Show actual label (only high confidence labels >= 70%)
  if (label) {
    const backgroundColor = getCategoryColor(label.label_category, isDarkMode);

    return (
      <View style={[styles.chip, { backgroundColor }]}>
        <Text style={styles.chipText}>{label.label_name}</Text>
      </View>
    );
  }

  return null;
};

interface LabelListProps {
  labels?: Label[];
  labelingStatus?: LabelingStatus;
  maxVisible?: number;
}

export const LabelList: React.FC<LabelListProps> = ({
  labels,
  labelingStatus,
  maxVisible = 5
}) => {
  const isDarkMode = useColorScheme() === 'dark';

  // Filter labels with confidence >= 70%
  const highConfidenceLabels = labels?.filter(label => label.confidence_score >= 0.7) || [];

  // Show pending state if no labels yet
  if (highConfidenceLabels.length === 0) {
    return (
      <View style={styles.labelContainer}>
        <LabelChip status={labelingStatus || 'pending'} isPending />
      </View>
    );
  }

  const visibleLabels = highConfidenceLabels.slice(0, maxVisible);
  const remainingCount = highConfidenceLabels.length - maxVisible;

  return (
    <View style={styles.labelContainer}>
      {visibleLabels.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
      {remainingCount > 0 && (
        <View style={[styles.chip, styles.moreChip, isDarkMode && styles.moreChipDark]}>
          <Text style={[styles.chipText, styles.moreText, isDarkMode && styles.moreTextDark]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  labelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confidenceText: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  pendingChip: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderStyle: 'dashed',
    paddingVertical: 5,
  },
  pendingChipDark: {
    backgroundColor: '#1C1C1E',
    borderColor: '#48484A',
  },
  pendingText: {
    color: '#8E8E93',
  },
  failedChip: {
    backgroundColor: '#FF3B30',
  },
  failedText: {
    color: '#FFFFFF',
  },
  moreChip: {
    backgroundColor: '#E5E5EA',
  },
  moreChipDark: {
    backgroundColor: '#3A3A3C',
  },
  moreText: {
    color: '#8E8E93',
  },
  moreTextDark: {
    color: '#AEAEB2',
  },
});
