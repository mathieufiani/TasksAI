import React, { useState, useRef } from 'react';
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
import { ChatMessage, RecommendationResponse } from '../types/Recommendation';
import { getRecommendations } from '../api/recommendations';
import { TypingText } from '../components/TypingText';

export const ChatBotScreen: React.FC = () => {
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
  const flatListRef = useRef<FlatList>(null);
  const isDarkMode = useColorScheme() === 'dark';

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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.type === 'user';
    const shouldAnimate = !isUser && item.id === latestAssistantMessageId;

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
              speed={30}
              style={[
                styles.messageText,
                styles.assistantMessageText,
                isDarkMode && styles.assistantMessageTextDark,
              ]}
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

          {item.recommendations && item.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={[styles.recommendationsTitle, isDarkMode && styles.recommendationsTitleDark]}>
                Recommended Tasks:
              </Text>
              {item.recommendations.map((rec, index) => (
                <View key={rec.task_id} style={styles.recommendationCard}>
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
                </View>
              ))}
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
});
