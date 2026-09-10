import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface ScreenContextType {
  isMainScreen: boolean;
  setIsMainScreen: (isMain: boolean) => void;
  currentScreen: string | null;
  /**
   * Set the active screen. Passing `null` releases ownership, but only if the
   * caller still owns it — a screen's blur cleanup may run *after* the next
   * screen's focus (e.g. `router.replace('/')` from a profile), and must not
   * wipe out the freshly focused 'home' (that froze the pucks).
   */
  setCurrentScreen: (screen: string | null, releasing?: string) => void;
}

const ScreenContext = createContext<ScreenContextType | undefined>(undefined);

export const useScreenContext = () => {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error('useScreenContext must be used within a ScreenProvider');
  }
  return context;
};

interface ScreenProviderProps {
  children: ReactNode;
}

export const ScreenProvider: React.FC<ScreenProviderProps> = ({ children }) => {
  const [isMainScreen, setIsMainScreen] = useState(false);
  const [currentScreen, setCurrentScreenState] = useState<string | null>(null);

  const setCurrentScreen = React.useCallback((screen: string | null, releasing?: string) => {
    if (screen === null && releasing) {
      setCurrentScreenState((prev) => (prev === releasing ? null : prev));
      return;
    }
    setCurrentScreenState(screen);
  }, []);

  // Логируем изменения состояния экрана для отладки
  React.useEffect(() => {
    // Обновляем isMainScreen на основе currentScreen
    const isMain = currentScreen === 'index';
    setIsMainScreen(isMain);
  }, [currentScreen]);

  const value = useMemo(
    () => ({ isMainScreen, setIsMainScreen, currentScreen, setCurrentScreen }),
    [isMainScreen, currentScreen, setCurrentScreen]
  );

  return (
    <ScreenContext.Provider value={value}>
      {children}
    </ScreenContext.Provider>
  );
};
