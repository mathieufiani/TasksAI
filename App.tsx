/**
 * My Todo App
 * A simple todo application with AI capabilities
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TodoScreen } from './src/screens/TodoScreen';
import { ChatBotScreen } from './src/screens/ChatBotScreen';

const Tab = createBottomTabNavigator();

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [loading, setLoading] = useState(true);

  // Give app time to initialize
  useEffect(() => {
    setTimeout(() => setLoading(false), 100);
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View
          style={[
            styles.loadingContainer,
            isDarkMode ? styles.containerDark : styles.containerLight,
          ]}>
          <ActivityIndicator
            size="large"
            color={isDarkMode ? '#FFFFFF' : '#000000'}
          />
          <Text
            style={[styles.loadingText, isDarkMode && styles.loadingTextDark]}>
            Loading...
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
            tabBarStyle: {
              backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
              borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
            },
          }}>
          <Tab.Screen
            name="Tasks"
            component={TodoScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>✓</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Assistant"
            component={ChatBotScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>💬</Text>
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
  },
  containerLight: {
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  loadingTextDark: {
    color: '#FFFFFF',
  },
});

export default App;
