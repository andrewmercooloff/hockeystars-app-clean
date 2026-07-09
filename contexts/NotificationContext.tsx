import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Player } from '../utils/playerStorage';

interface NotificationContextType {
  updateNotificationCount: (user?: Player | null) => Promise<void>;
  /** Forces a fresh read of unread messages + unread notifications from DB. */
  refreshBadges: () => Promise<void>;
  /** Optimistic local override of unread messages badge (e.g. when opening a chat). */
  setUnreadMessagesBadge: (count: number) => void;
  /** Optimistic local override of unread notifications badge (e.g. when opening notifications screen). */
  setUnreadNotificationsBadge: (count: number) => void;
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
  updateNotificationCount: (user?: Player | null) => Promise<void>;
  refreshBadges: () => Promise<void>;
  setUnreadMessagesBadge: (count: number) => void;
  setUnreadNotificationsBadge: (count: number) => void;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  updateNotificationCount,
  refreshBadges,
  setUnreadMessagesBadge,
  setUnreadNotificationsBadge,
}) => {
  const value = useMemo(
    () => ({
      updateNotificationCount,
      refreshBadges,
      setUnreadMessagesBadge,
      setUnreadNotificationsBadge,
    }),
    [updateNotificationCount, refreshBadges, setUnreadMessagesBadge, setUnreadNotificationsBadge]
  );
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
