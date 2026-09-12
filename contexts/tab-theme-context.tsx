import { createContext, ReactNode, useContext, useState } from 'react';

export type TabBarTheme = 'default';

type TabThemeContextValue = {
  tabBarTheme: TabBarTheme;
  setTabBarTheme: (theme: TabBarTheme) => void;
};

const TabThemeContext = createContext<TabThemeContextValue | null>(null);

export function TabThemeProvider({ children }: { children: ReactNode }) {
  const [tabBarTheme, setTabBarTheme] = useState<TabBarTheme>('default');

  return (
    <TabThemeContext.Provider value={{ tabBarTheme, setTabBarTheme }}>
      {children}
    </TabThemeContext.Provider>
  );
}

export function useTabTheme() {
  const ctx = useContext(TabThemeContext);
  if (!ctx) {
    throw new Error('useTabTheme must be used within a TabThemeProvider');
  }
  return ctx;
}
