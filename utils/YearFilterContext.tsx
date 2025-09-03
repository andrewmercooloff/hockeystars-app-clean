import React, { createContext, ReactNode, useContext, useState } from 'react';

interface YearFilterContextType {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  showYearFilter: boolean;
  setShowYearFilter: (show: boolean) => void;
}

const YearFilterContext = createContext<YearFilterContextType | undefined>(undefined);

export const useYearFilter = () => {
  const context = useContext(YearFilterContext);
  if (context === undefined) {
    throw new Error('useYearFilter must be used within a YearFilterProvider');
  }
  return context;
};

interface YearFilterProviderProps {
  children: ReactNode;
}

export const YearFilterProvider: React.FC<YearFilterProviderProps> = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showYearFilter, setShowYearFilter] = useState(false);

  return (
    <YearFilterContext.Provider value={{
      selectedYear,
      setSelectedYear,
      showYearFilter,
      setShowYearFilter,
    }}>
      {children}
    </YearFilterContext.Provider>
  );
};

