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
import { TodoScreen } from './src/screens/TodoScreen';
import { ChatBotScreen } from './src/screens/ChatBotScreen';
import colors from './src/theme/colors';
import { spacing, borderRadius } from './src/theme/styles';

const Tab = createBottomTabNavigator();

function App() {
  const [loading, setLoading] = useState(true);

  // Give app time to initialize
  useEffect(() => {
    setTimeout(() => setLoading(false), 100);
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <Text style={styles.loadingEmoji}>✨</Text>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />
            <Text style={styles.loadingText}>
              TasksAI is waking up...
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
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopWidth: 0,
              elevation: 20,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 1,
              shadowRadius: 12,
              height: 90,
              paddingBottom: spacing.lg,
              paddingTop: spacing.sm,
              borderTopLeftRadius: borderRadius.lg,
              borderTopRightRadius: borderRadius.lg,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
              marginTop: 4,
            },
          }}>
          <Tab.Screen
            name="Tasks"
            component={TodoScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={[
                  styles.tabIconContainer,
                  focused && styles.tabIconContainerActive,
                ]}>
                  <Text style={{ fontSize: 24, color }}>✓</Text>
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="Assistant"
            component={ChatBotScreen}
            options={{
              tabBarIcon: ({ color, focused }) => (
                <View style={[
                  styles.tabIconContainer,
                  focused && styles.tabIconContainerActive,
                ]}>
                  <Text style={{ fontSize: 24, color }}>💬</Text>
                </View>
              ),
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
    shadowRadius: 16,
    elevation: 8,
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tabIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabIconContainerActive: {
    backgroundColor: colors.primaryLight,
  },
});

export default App;
