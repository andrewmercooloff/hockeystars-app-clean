import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScreenContextType {
  isMainScreen: boolean;
  setIsMainScreen: (isMain: boolean) => void;
  currentScreen: string | null;
  setCurrentScreen: (screen: string | null) => void;
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
  const [currentScreen, setCurrentScreen] = useState<string | null>(null);

  // Логируем изменения состояния экрана для отладки
  React.useEffect(() => {
    // Обновляем isMainScreen на основе currentScreen
    const isMain = currentScreen === 'index';
    setIsMainScreen(isMain);
  }, [currentScreen]);

  return (
    <ScreenContext.Provider value={{ isMainScreen, setIsMainScreen, currentScreen, setCurrentScreen }}>
      {children}
    </ScreenContext.Provider>
  );
};
