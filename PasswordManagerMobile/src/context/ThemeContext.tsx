import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { warmLightTheme, warmDarkTheme } from '../theme/warmTheme';

interface ThemeContextType {
  isDarkMode: boolean;
  theme: typeof warmLightTheme;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@password_manager_theme';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      
      if (savedTheme !== null) {
        // Use saved preference
        const isDark = savedTheme === 'dark';
        setIsDarkMode(isDark);
      } else {
        // Use system preference
        const systemColorScheme = Appearance.getColorScheme();
        const isDark = systemColorScheme === 'dark';
        setIsDarkMode(isDark);
        // Save initial preference
        await AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Fallback to system preference
      const systemColorScheme = Appearance.getColorScheme();
      setIsDarkMode(systemColorScheme === 'dark');
    }
  };

  const saveThemePreference = async (isDark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    await saveThemePreference(newIsDarkMode);
  };

  const setTheme = async (isDark: boolean) => {
    setIsDarkMode(isDark);
    await saveThemePreference(isDark);
  };

  const theme = isDarkMode ? warmDarkTheme : warmLightTheme;

  const value: ThemeContextType = {
    isDarkMode,
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};