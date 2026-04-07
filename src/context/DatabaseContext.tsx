import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as DB from '../api';
import type { DatabaseContextType } from '../types';

export const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await DB.initDatabase();
      setIsReady(true);
      setError(null);
    } catch (err) {
      console.error('Failed to initialize database:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize database');
      setIsReady(false);
    }
  };

  const reloadData = async () => {
    setIsReady(false);
    await initializeDatabase();
  };

  return (
    <DatabaseContext.Provider value={{ isReady, error, reloadData }}>
      {children}
    </DatabaseContext.Provider>
  );
};
