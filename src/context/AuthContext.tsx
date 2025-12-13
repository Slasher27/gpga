import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as DB from '../db';
import type { AuthContextType, AuthUser, LoginCredentials } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check authentication status on mount
  useEffect(() => {
    const authStatus = DB.isAuthenticated();
    const userId = DB.getCurrentUserId();

    if (authStatus && userId) {
      // Fetch user data from database
      const players = DB.getAllPlayers();
      const currentUser = players.find(p => p.id === userId);

      if (currentUser) {
        setUser({
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          status: currentUser.status
        });
        setIsAuthenticated(true);
      } else {
        // User not found, clear auth
        DB.logout();
        setIsAuthenticated(false);
      }
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    const authenticatedUser = DB.authenticateUser(credentials.email, credentials.password);

    if (authenticatedUser) {
      DB.setAuthenticated(true);
      DB.setCurrentUserId(authenticatedUser.id);

      // Handle remember me
      if (credentials.rememberMe) {
        localStorage.setItem('gpga_remembered_email', credentials.email);
      } else {
        localStorage.removeItem('gpga_remembered_email');
      }

      setUser(authenticatedUser);
      setIsAuthenticated(true);
      return true;
    }

    return false;
  };

  const logout = () => {
    DB.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
