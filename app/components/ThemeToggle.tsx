'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg transition-all duration-300 ease-in-out
                 text-marketplace-text-muted hover:text-marketplace-text
                 hover:bg-marketplace-hover
                 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon for light mode */}
        <Sun 
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ease-in-out transform
                     ${theme === 'light' 
                       ? 'opacity-100 rotate-0 scale-100' 
                       : 'opacity-0 rotate-90 scale-75'}`}
        />
        
        {/* Moon icon for dark mode */}
        <Moon 
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ease-in-out transform
                     ${theme === 'dark' 
                       ? 'opacity-100 rotate-0 scale-100' 
                       : 'opacity-0 -rotate-90 scale-75'}`}
        />
      </div>
    </button>
  );
}

export default ThemeToggle;
