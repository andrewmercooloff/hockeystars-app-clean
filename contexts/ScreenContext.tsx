import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScreenContextType {
  isMainScreen: boolean;
  setIsMainScreen: (isMain: boolean) => void;
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

  // Логируем изменения состояния экрана для отладки
  React.useEffect(() => {
    console.log('🖥️ ЭКРАН: isMainScreen изменился на', isMainScreen);
  }, [isMainScreen]);

  return (
    <ScreenContext.Provider value={{ isMainScreen, setIsMainScreen }}>
      {children}
    </ScreenContext.Provider>
  );
};
