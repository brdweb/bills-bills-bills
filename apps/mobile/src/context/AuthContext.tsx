import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { User, DatabaseInfo } from '../types';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  databases: DatabaseInfo[];
  currentDatabase: string | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectDatabase: (dbName: string) => Promise<void>;
  refreshDatabases: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    databases: [],
    currentDatabase: null,
  });

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const hasToken = await api.initialize();

      if (hasToken) {
        // Verify token is still valid by fetching user info
        const response = await api.getAccounts();
        if (response.success && response.data) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            user: null, // We don't have full user info from getAccounts
            databases: response.data,
            currentDatabase: api.getCurrentDatabase(),
          });
          return;
        }
      }

      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        databases: [],
        currentDatabase: null,
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        databases: [],
        currentDatabase: null,
      });
    }
  };

  // Set up auth error handler to trigger logout
  useEffect(() => {
    api.setAuthErrorHandler(() => {
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        databases: [],
        currentDatabase: null,
      });
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await api.login(username, password);

      if (response.success && response.data) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          user: response.data.user,
          databases: response.data.databases,
          currentDatabase: response.data.databases[0]?.name || null,
        });
        return { success: true };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      databases: [],
      currentDatabase: null,
    });
  }, []);

  const selectDatabase = useCallback(async (dbName: string) => {
    await api.setCurrentDatabase(dbName);
    setState(prev => ({ ...prev, currentDatabase: dbName }));
  }, []);

  const refreshDatabases = useCallback(async () => {
    const response = await api.getAccounts();
    if (response.success && response.data) {
      setState(prev => ({ ...prev, databases: response.data! }));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        selectDatabase,
        refreshDatabases,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
