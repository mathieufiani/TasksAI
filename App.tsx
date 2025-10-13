/**
 * TasksAI - Gamified Todo App
 * A delightful, pastel-themed todo application with AI capabilities
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TasksStackNavigator } from './src/navigation/TasksStackNavigator';
import { ChatBotScreen } from './src/screens/ChatBotScreen';
import colors from './src/theme/colors';
import { spacing, borderRadius } from './src/theme/styles';

const Tab = createBottomTabNavigator();

// Tab bar icon components
const TasksIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Text style={[styles.tabIcon, { color }]}>
    {focused ? '✅' : '☑️'}
  </Text>
);

const AssistantIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Text style={[styles.tabIcon, { color }]}>
    {focused ? '💬' : '💭'}
  </Text>
);

function App() {
  const [loading, setLoading] = useState(true);

  // Give app time to initialize
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <Text style={styles.loadingEmoji}>✅</Text>
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loadingSpinner}
            />
            <Text style={styles.loadingText}>
              Loading TasksAI...
            </Text>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              height: 80,
              paddingBottom: spacing.lg,
              paddingTop: spacing.sm,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
              marginTop: 4,
            },
          }}>
          <Tab.Screen
            name="Tasks"
            component={TasksStackNavigator}
            options={{
              tabBarIcon: TasksIcon,
            }}
          />
          <Tab.Screen
            name="Assistant"
            component={ChatBotScreen}
            options={{
              tabBarIcon: AssistantIcon,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingEmoji: {
    fontSize: 64,
  },
  loadingSpinner: {
    marginTop: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tabIcon: {
    fontSize: 24,
  },
});

export default App;
