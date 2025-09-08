'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserStats, getCurrentUser, getUserStats, recordSession } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  stats: UserStats | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<Omit<User, 'id' | 'createdAt'>>) => void;
  recordSession: (durationMinutes: number, journeyId: number, journeyTitle: string) => void;
  refreshStats: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初期認証状態の確認
    const currentUser = getCurrentUser();
    const currentStats = getUserStats();
    
    setUser(currentUser);
    setStats(currentStats);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { login: authLogin } = await import('@/lib/auth');
    const user = await authLogin(email, password);
    setUser(user);
    
    const userStats = getUserStats();
    setStats(userStats);
  };

  const register = async (email: string, password: string, name: string) => {
    const { register: authRegister } = await import('@/lib/auth');
    const user = await authRegister(email, password, name);
    setUser(user);
    
    const userStats = getUserStats();
    setStats(userStats);
  };

  const logout = () => {
    const { logout: authLogout } = await import('@/lib/auth');
    authLogout();
    setUser(null);
    setStats(null);
  };

  const updateUser = (updates: Partial<Omit<User, 'id' | 'createdAt'>>) => {
    if (!user) return;
    
    const { updateUser: authUpdateUser } = await import('@/lib/auth');
    const updatedUser = authUpdateUser(updates);
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const handleRecordSession = (durationMinutes: number, journeyId: number, journeyTitle: string) => {
    recordSession(durationMinutes, journeyId, journeyTitle);
    
    // 統計を再読み込み
    const updatedStats = getUserStats();
    const updatedUser = getCurrentUser();
    
    setStats(updatedStats);
    setUser(updatedUser);
  };

  const refreshStats = () => {
    const currentStats = getUserStats();
    const currentUser = getCurrentUser();
    
    setStats(currentStats);
    setUser(currentUser);
  };

  const value: AuthContextType = {
    user,
    stats,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    recordSession: handleRecordSession,
    refreshStats,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};