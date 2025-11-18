import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { queryClient } from '@/lib/queryClient';
import { User } from '../../../shared/schema';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    // Invalidar tokens de demonstração antigos
    if (token && token.startsWith('demo_token_')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      return;
    }

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        // Clear inconsistent state
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    // Clear any cached data from previous sessions
    try { queryClient.clear(); } catch (e) { /* noop */ }
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    navigate('/dashboard');
  };

  const logout = () => {
    // Clear any cached data when logging out
    try { queryClient.clear(); } catch (e) { /* noop */ }
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
