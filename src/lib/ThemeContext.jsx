import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getUserPreferences, updateUserPreferences } from '@/lib/settings';
import { getAuthToken } from '@/lib/api-client';

const ThemeContext = createContext(undefined);

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
  
  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
  
  // Store effective theme for quick access
  localStorage.setItem('theme-preference', theme);
  localStorage.setItem('theme-effective', effectiveTheme);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // Load from localStorage first for instant apply, backend will sync later
    const stored = localStorage.getItem('theme-preference');
    return stored || 'light';
  });
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Load theme preference from backend when user is logged in
  useEffect(() => {
    const loadThemeFromBackend = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await getUserPreferences();
        if (response.success && response.data?.theme) {
          setThemeState(response.data.theme);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemeFromBackend();
  }, []);

  // Save theme to backend and update local state
  const setTheme = useCallback(async (newTheme) => {
    // Immediately apply locally
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Persist to backend if logged in
    const token = getAuthToken();
    if (token) {
      try {
        await updateUserPreferences({ theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, setTheme]);

  // Get the currently active theme (resolves 'system' to actual value)
  const resolvedTheme = useMemo(() => {
    return theme === 'system' ? getSystemTheme() : theme;
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isLoading,
  }), [theme, resolvedTheme, setTheme, toggleTheme, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
