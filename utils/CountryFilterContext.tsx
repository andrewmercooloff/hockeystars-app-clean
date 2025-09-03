import React, { createContext, ReactNode, useContext, useState } from 'react';

interface CountryFilterContextType {
  selectedCountry: string | null;
  setSelectedCountry: (country: string | null) => void;
  showCountryFilter: boolean;
  setShowCountryFilter: (show: boolean) => void;
}

const CountryFilterContext = createContext<CountryFilterContextType | undefined>(undefined);

export const useCountryFilter = () => {
  const context = useContext(CountryFilterContext);
  if (context === undefined) {
    throw new Error('useCountryFilter must be used within a CountryFilterProvider');
  }
  return context;
};

interface CountryFilterProviderProps {
  children: ReactNode;
}

export const CountryFilterProvider: React.FC<CountryFilterProviderProps> = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showCountryFilter, setShowCountryFilter] = useState(false);

  return (
    <CountryFilterContext.Provider value={{
      selectedCountry,
      setSelectedCountry,
      showCountryFilter,
      setShowCountryFilter,
    }}>
      {children}
    </CountryFilterContext.Provider>
  );
};


