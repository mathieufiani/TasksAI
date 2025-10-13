import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ChatMessage, RecommendationResponse, TaskSuggestion } from '../types/Recommendation';
import { getRecommendations } from '../api/recommendations';
import { TypingText } from '../components/TypingText';
import { apiService } from '../services/api';
import { Todo } from '../types/Todo';

interface ChatBotScreenProps {
  navigation: any;
}

export const ChatBotScreen: React.FC<ChatBotScreenProps> = ({ navigation }) => {
  const safeAreaInsets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      text: "Hi! Tell me how you're feeling right now, where you are, and how much time you have. I'll recommend the perfect tasks for you!",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestAssistantMessageId, setLatestAssistantMessageId] = useState<string>('1');
  const [typingCompleteForMessage, setTypingCompleteForMessage] = useState<Record<string, boolean>>({ '1': true });
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const isDarkMode = useColorScheme() === 'dark';

  const handleRecommendationPress = async (taskId: number) => {
    try {
      // Fetch the full task details
      const backendTask = await apiService.getTask(taskId);
      const labels = await apiService.getTaskLabels(taskId);

      // Convert backend task to frontend Todo format
      const todo: Todo = {
        id: backendTask.id.toString(),
        text: backendTask.title,
        completed: backendTask.completed,
        priority: apiService.priorityToFrontend(backendTask.priority),
        createdAt: new Date(backendTask.created_at),
        deadline: backendTask.due_date ? new Date(backendTask.due_date) : undefined,
        labels: labels,
        labelingStatus: backendTask.labeling_status,
      };

      // Navigate to TaskDetail screen in the Tasks stack
      navigation.navigate('Tasks', {
        screen: 'TaskDetail',
        params: {
          todo,
          onUpdate: (updatedTodo: Todo) => {
            // No-op for now, could update local state if needed
            console.log('Task updated from ChatBot:', updatedTodo);
          },
          onDelete: (id: string) => {
            // No-op for now, could update local state if needed
            console.log('Task deleted from ChatBot:', id);
          },
        },
      });
    } catch (error) {
      console.error('Error navigating to task:', error);
    }
  };

  const handleAddSuggestion = async (suggestion: TaskSuggestion, suggestionKey: string) => {
    try {
      // Create task from suggestion
      const newTask = await apiService.createTask({
        title: suggestion.title,
        description: suggestion.description || undefined,
        priority: suggestion.suggested_priority as 'low' | 'medium' | 'high',
        due_date: suggestion.suggested_due_date || undefined,
      });

      // Mark this suggestion as added
      setAddedSuggestions(prev => new Set([...prev, suggestionKey]));

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Task Added!',
        text2: `"${suggestion.title}" has been added to your backlog`,
        position: 'bottom',
        visibilityTime: 3000,
      });

      console.log('Task created:', newTask);
    } catch (error) {
      console.error('Error adding suggestion:', error);

      // Show error toast
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add task. Please try again.',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await getRecommendations(userMessage.text);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: response.message,
        recommendations: response.recommendations,
        suggestions: response.suggestions,
        timestamp: new Date(),
      };

      setLatestAssistantMessageId(assistantMessage.id);
      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error getting recommendations:', error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: "Sorry, I couldn't get recommendations right now. Please try again!",
        timestamp: new Date(),
      };

      setLatestAssistantMessageId(errorMessage.id);
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypingComplete = useCallback((messageId: string) => {
    setTypingCompleteForMessage(prev => {
      // Only update if not already complete to avoid infinite loop
      if (prev[messageId]) {
        return prev;
      }
      return { ...prev, [messageId]: true };
    });
  }, []);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.type === 'user';
    const shouldAnimate = !isUser && item.id === latestAssistantMessageId;
    const isTypingComplete = typingCompleteForMessage[item.id] || false;

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? styles.userBubble
              : [styles.assistantBubble, isDarkMode && styles.assistantBubbleDark],
          ]}
        >
          {shouldAnimate ? (
            <TypingText
              text={item.text}
              speed={15}
              style={
                isDarkMode
                  ? [styles.messageText, styles.assistantMessageText, styles.assistantMessageTextDark]
                  : [styles.messageText, styles.assistantMessageText]
              }
              onComplete={() => handleTypingComplete(item.id)}
            />
          ) : (
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userMessageText : styles.assistantMessageText,
                isDarkMode && !isUser && styles.assistantMessageTextDark,
              ]}
            >
              {item.text}
            </Text>
          )}

          {isTypingComplete && item.recommendations && item.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={[styles.recommendationsTitle, isDarkMode && styles.recommendationsTitleDark]}>
                Recommended Tasks:
              </Text>
              {item.recommendations.map((rec, index) => (
                <TouchableOpacity
                  key={rec.task_id}
                  style={styles.recommendationCard}
                  onPress={() => handleRecommendationPress(rec.task_id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recommendationHeader}>
                    <Text style={[styles.recommendationTitle, isDarkMode && styles.recommendationTitleDark]}>
                      {index + 1}. {rec.title}
                    </Text>
                    <View style={styles.matchScoreContainer}>
                      <Text style={styles.matchScoreText}>
                        {Math.round(rec.match_score * 100)}% match
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.recommendationReasoning, isDarkMode && styles.recommendationReasoningDark]}>
                    {rec.reasoning}
                  </Text>
                  <View style={styles.labelsContainer}>
                    {rec.matching_labels.map((label) => (
                      <View key={label} style={styles.labelChip}>
                        <Text style={styles.labelText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isTypingComplete && item.suggestions && item.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsTitle, isDarkMode && styles.suggestionsTitleDark]}>
                New Task Suggestions:
              </Text>
              {item.suggestions.map((sug, index) => {
                const suggestionKey = `${item.id}-${index}`;
                const isAdded = addedSuggestions.has(suggestionKey);

                return (
                  <View
                    key={index}
                    style={styles.suggestionCard}
                  >
                    <View style={styles.suggestionHeader}>
                      <Text style={[styles.suggestionTitle, isDarkMode && styles.suggestionTitleDark]}>
                        {index + 1}. {sug.title}
                      </Text>
                    </View>
                    {sug.description && (
                      <Text style={[styles.suggestionDescription, isDarkMode && styles.suggestionDescriptionDark]}>
                        {sug.description}
                      </Text>
                    )}
                    <Text style={[styles.suggestionReasoning, isDarkMode && styles.suggestionReasoningDark]}>
                      {sug.reasoning}
                    </Text>
                    <View style={styles.suggestionFooter}>
                      <View style={styles.suggestionLabelsContainer}>
                        {sug.suggested_labels.map((label) => (
                          <View key={label} style={styles.suggestionLabelChip}>
                            <Text style={styles.suggestionLabelText}>{label}</Text>
                          </View>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[styles.addButton, isAdded && styles.addButtonAdded]}
                        onPress={() => handleAddSuggestion(sug, suggestionKey)}
                        activeOpacity={0.7}
                        disabled={isAdded}
                      >
                        <Text style={styles.addButtonText}>
                          {isAdded ? '✓ Task Added' : 'Add to Backlog'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDarkMode && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingTop: safeAreaInsets.top + 16 }
        ]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
        <TextInput
          style={[styles.input, isDarkMode && styles.inputDark]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="How are you feeling? Where are you?"
          placeholderTextColor={isDarkMode ? '#8E8E93' : '#8E8E93'}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  assistantBubble: {
    backgroundColor: '#F2F2F7',
  },
  assistantBubbleDark: {
    backgroundColor: '#1C1C1E',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#000000',
  },
  assistantMessageTextDark: {
    color: '#FFFFFF',
  },
  recommendationsContainer: {
    marginTop: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  recommendationsTitleDark: {
    color: '#FFFFFF',
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  recommendationTitleDark: {
    color: '#000000',
  },
  matchScoreContainer: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  matchScoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recommendationReasoning: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 18,
  },
  recommendationReasoningDark: {
    color: '#666666',
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  labelChip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'flex-end',
  },
  inputContainerDark: {
    backgroundColor: '#000000',
    borderTopColor: '#38383A',
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    color: '#000000',
  },
  inputDark: {
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  suggestionsTitleDark: {
    color: '#FFFFFF',
  },
  suggestionCard: {
    backgroundColor: '#F9F9FB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  suggestionHeader: {
    marginBottom: 6,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  suggestionTitleDark: {
    color: '#000000',
  },
  suggestionDescription: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 6,
    lineHeight: 17,
  },
  suggestionDescriptionDark: {
    color: '#666666',
  },
  suggestionReasoning: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  suggestionReasoningDark: {
    color: '#888888',
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  suggestionLabelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  suggestionLabelChip: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  suggestionLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonAdded: {
    backgroundColor: '#6B7280',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
