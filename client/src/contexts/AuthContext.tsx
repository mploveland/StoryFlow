import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  displayName?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string, displayName?: string, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize: Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('storyflow_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user data');
        localStorage.removeItem('storyflow_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest('POST', '/api/auth/login', {
        username,
        password
      });
      
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('storyflow_user', JSON.stringify(data.user));
        toast({
          title: 'Login successful',
          description: `Welcome ${data.user.displayName || data.user.username}!`,
        });
      }
    } catch (error: any) {
      const message = error.message || 'Failed to login. Please try again.';
      setError(message);
      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // In a real app, would call logout API endpoint
      // await apiRequest('POST', '/api/auth/logout');
      
      setUser(null);
      localStorage.removeItem('storyflow_user');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error: any) {
      const message = error.message || 'Failed to logout. Please try again.';
      setError(message);
      toast({
        title: 'Logout failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, password: string, displayName?: string, email?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest('POST', '/api/auth/register', {
        username,
        password,
        displayName,
        email
      });
      
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('storyflow_user', JSON.stringify(data.user));
        toast({
          title: 'Registration successful',
          description: 'Your account has been created and you are now logged in.',
        });
      }
    } catch (error: any) {
      const message = error.message || 'Failed to register. Please try again.';
      setError(message);
      toast({
        title: 'Registration failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
