import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Player } from '../utils/playerStorage';

interface NotificationContextType {
  updateNotificationCount: (user?: Player | null) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  updateNotificationCount: () => Promise<void>;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  updateNotificationCount 
}) => {
  const value = useMemo(
    () => ({ updateNotificationCount }),
    [updateNotificationCount]
  );
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
