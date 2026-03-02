'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashboardLayout = Record<string, readonly any[]>;

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  dashboard_layout: DashboardLayout;
  dismissed_tooltips: string[];
}

const DEFAULTS: UserPreferences = {
  theme: 'light',
  dashboard_layout: {},
  dismissed_tooltips: [],
};

const LOCAL_KEY = 'duesiq_user_preferences';

function getLocalPrefs(): Partial<UserPreferences> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalPrefs(prefs: Partial<UserPreferences>) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalPrefs();
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...existing, ...prefs }));
  } catch {
    // localStorage unavailable
  }
}

export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load preferences: try Supabase first, fall back to localStorage
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const localPrefs = getLocalPrefs();

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && !cancelled) {
          const { data } = await supabase
            .from('user_preferences')
            .select('theme, dashboard_layout, dismissed_tooltips')
            .eq('user_id', user.id)
            .single();

          if (data && !cancelled) {
            setPrefs({
              theme: data.theme || DEFAULTS.theme,
              dashboard_layout: data.dashboard_layout || DEFAULTS.dashboard_layout,
              dismissed_tooltips: data.dismissed_tooltips || DEFAULTS.dismissed_tooltips,
            });
            setLoaded(true);
            return;
          }
        }
      } catch {
        // Supabase not available, use localStorage
      }

      if (!cancelled) {
        setPrefs({ ...DEFAULTS, ...localPrefs });
        setLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save a preference update to both localStorage and Supabase
  const updatePrefs = useCallback(
    async (updates: Partial<UserPreferences>) => {
      const next = { ...prefs, ...updates };
      setPrefs(next);
      setLocalPrefs(updates);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from('user_preferences')
            .upsert(
              { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' },
            );
        }
      } catch {
        // Offline or not authenticated, localStorage already saved
      }
    },
    [prefs],
  );

  const setThemePreference = useCallback(
    (theme: 'light' | 'dark' | 'system') => updatePrefs({ theme }),
    [updatePrefs],
  );

  const setDashboardLayout = useCallback(
    (layout: DashboardLayout) => updatePrefs({ dashboard_layout: layout }),
    [updatePrefs],
  );

  const dismissTooltip = useCallback(
    (tooltipId: string) => {
      if (!prefs.dismissed_tooltips.includes(tooltipId)) {
        updatePrefs({
          dismissed_tooltips: [...prefs.dismissed_tooltips, tooltipId],
        });
      }
    },
    [prefs.dismissed_tooltips, updatePrefs],
  );

  const isTooltipDismissed = useCallback(
    (tooltipId: string) => prefs.dismissed_tooltips.includes(tooltipId),
    [prefs.dismissed_tooltips],
  );

  return {
    prefs,
    loaded,
    setThemePreference,
    setDashboardLayout,
    dismissTooltip,
    isTooltipDismissed,
  };
}
