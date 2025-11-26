'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark'); // Default to dark theme
  const [mounted, setMounted] = useState(false);

  // Handle hydration and theme initialization
  useEffect(() => {
    setMounted(true);

    // Only access localStorage after mounting
    try {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setThemeState(savedTheme);
      } else {
        // Default to dark theme
        localStorage.setItem('theme', 'dark');
      }
    } catch (error) {
      // Handle localStorage access errors (e.g., in SSR)
      console.warn('Could not access localStorage:', error);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    try {
      const root = document.documentElement;

      // Remove existing theme classes
      root.classList.remove('light', 'dark');

      // Add current theme class
      root.classList.add(theme);

      // Save to localStorage
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.warn('Could not apply theme:', error);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // Always render the same structure to prevent hydration mismatch
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div className={mounted ? theme : 'dark'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
