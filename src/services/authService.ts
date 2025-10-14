/**
 * Authentication service
 * Handles login, registration, Google Sign-In, and token refresh
 */

import axios from 'axios';
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { API_URL } from '../config/api';
import { authStorage, TokenData, UserData } from './authStorage';

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  constructor() {
    // Configure Google Sign-In
    GoogleSignin.configure({
      iosClientId: '760010077219-fo9ra7n76fheo5tgq7vl3tb3n6jsta51.apps.googleusercontent.com',
      webClientId: '760010077219-fo9ra7n76fheo5tgq7vl3tb3n6jsta51.apps.googleusercontent.com',
      offlineAccess: false,
    });
  }

  /**
   * Register with email and password
   */
  async register(data: RegisterData): Promise<{ user: UserData; tokens: TokenData }> {
    try {
      const response = await axios.post<TokenData>(`${API_URL}/api/v1/auth/register`, data);
      const tokens = response.data;

      // Store tokens
      await authStorage.setTokens(tokens);

      // Get user info
      const user = await this.getCurrentUser(tokens.access_token);
      await authStorage.setUserData(user);

      return { user, tokens };
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  }

  /**
   * Login with email and password
   */
  async login(data: LoginData): Promise<{ user: UserData; tokens: TokenData }> {
    try {
      const response = await axios.post<TokenData>(`${API_URL}/api/v1/auth/login`, data);
      const tokens = response.data;

      // Store tokens
      await authStorage.setTokens(tokens);

      // Get user info
      const user = await this.getCurrentUser(tokens.access_token);
      await authStorage.setUserData(user);

      return { user, tokens };
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  /**
   * Sign in with Google
   */
  async googleSignIn(): Promise<{ user: UserData; tokens: TokenData }> {
    try {
      // Check if device supports Google Play Services (Android only)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }

      // Get user info from Google
      const userInfo = await GoogleSignin.signIn();

      // Send ID token to backend
      const response = await axios.post<TokenData>(`${API_URL}/api/v1/auth/google`, {
        id_token: userInfo.data?.idToken,
      });

      const tokens = response.data;

      // Store tokens
      await authStorage.setTokens(tokens);

      // Get user info from backend
      const user = await this.getCurrentUser(tokens.access_token);
      await authStorage.setUserData(user);

      return { user, tokens };
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      throw new Error(error.response?.data?.detail || error.message || 'Google Sign-In failed');
    }
  }

  /**
   * Get current user info from backend
   */
  async getCurrentUser(accessToken: string): Promise<UserData> {
    try {
      const response = await axios.get<UserData>(`${API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Get current user error:', error.response?.data || error.message);
      throw new Error('Failed to get user info');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenData> {
    try {
      const response = await axios.post<TokenData>(`${API_URL}/api/v1/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const tokens = response.data;
      await authStorage.setTokens(tokens);

      return tokens;
    } catch (error: any) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const accessToken = await authStorage.getAccessToken();

      if (accessToken) {
        // Call backend logout endpoint (revokes refresh tokens)
        try {
          await axios.post(
            `${API_URL}/api/v1/auth/logout`,
            {},
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
        } catch (error) {
          console.warn('Backend logout failed, continuing with local logout');
        }
      }

      // Sign out from Google if signed in
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        // It's OK if sign-out fails (user might not have signed in with Google)
        console.warn('Google sign-out skipped or failed');
      }

      // Clear local storage
      await authStorage.clearAuth();
    } catch (error) {
      console.error('Logout error:', error);
      // Always clear local storage even if backend call fails
      await authStorage.clearAuth();
    }
  }

  /**
   * Check if user is currently logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return await authStorage.isAuthenticated();
  }

  /**
   * Get stored user data
   */
  async getUser(): Promise<UserData | null> {
    return await authStorage.getUserData();
  }
}

export const authService = new AuthService();
