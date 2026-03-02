import { useTheme } from 'next-themes';
import { useUserPreferences } from '@/lib/hooks/use-user-preferences';
import { useEffect, useRef } from 'react';

export const useThemeSwitch = () => {
  const { theme, setTheme } = useTheme();
  const { prefs, loaded, setThemePreference } = useUserPreferences();
  const appliedServerPref = useRef(false);

  const isSystem = theme === 'system';

  const isDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const currentTheme = isSystem ? (isDark ? 'dark' : 'light') : theme;

  // Apply saved preference on load (once)
  useEffect(() => {
    if (loaded && !appliedServerPref.current && prefs.theme) {
      appliedServerPref.current = true;
      setTheme(prefs.theme);
    }
  }, [loaded, prefs.theme, setTheme]);

  const updateTheme = () => {
    let next: 'light' | 'dark';

    if (isSystem) {
      next = isDark ? 'light' : 'dark';
    } else {
      next = theme === 'dark' ? 'light' : 'dark';
    }

    setTheme(next);
    setThemePreference(next);
  };

  const setCurrentTheme = (t: string) => {
    setTheme(t);
    if (t === 'light' || t === 'dark' || t === 'system') {
      setThemePreference(t);
    }
  };

  return {
    currentTheme,
    updateTheme,
    setCurrentTheme,
  };
};

export default useThemeSwitch;
