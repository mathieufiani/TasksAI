/**
 * Secure token storage using AsyncStorage
 * Manages access tokens, refresh tokens, and user data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@TasksAI:accessToken';
const REFRESH_TOKEN_KEY = '@TasksAI:refreshToken';
const USER_DATA_KEY = '@TasksAI:userData';

export interface UserData {
  id: number;
  email: string;
  full_name: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

class AuthStorage {
  /**
   * Store authentication tokens
   */
  async setTokens(tokenData: TokenData): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokenData.access_token),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token),
      ]);
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  async setUserData(userData: UserData): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  }

  /**
   * Get user data
   */
  async getUserData(): Promise<UserData | null> {
    try {
      const userDataStr = await AsyncStorage.getItem(USER_DATA_KEY);
      return userDataStr ? JSON.parse(userDataStr) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  async clearAuth(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated (has valid tokens)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      return accessToken !== null;
    } catch (error) {
      return false;
    }
  }
}

export const authStorage = new AuthStorage();
