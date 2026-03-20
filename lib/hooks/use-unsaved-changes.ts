'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Global registry for tab guard - settings page registers itself here
type DirtyCallback = (isDirty: boolean) => void;
let _globalDirtyCallback: DirtyCallback | null = null;

export function registerSettingsTabGuard(cb: DirtyCallback) {
  _globalDirtyCallback = cb;
  return () => { _globalDirtyCallback = null; };
}

interface UseUnsavedChangesOptions {
  isDirty: boolean;
  onSave: () => Promise<void>;
}

export interface UseUnsavedChangesReturn {
  showWarning: boolean;
  handleDiscard: () => void;
  handleSaveAndLeave: () => void;
  handleCancel: () => void;
  saving: boolean;
}

export function useUnsavedChanges({
  isDirty,
  onSave,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingUrl = useRef<string | null>(null);
  const isDirtyRef = useRef(isDirty);

  // Keep ref in sync so the pushState wrapper reads the latest value
  isDirtyRef.current = isDirty;

  // ── Browser tab close / external navigation ──
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return;
      e.preventDefault();
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // ── Next.js client-side navigation interception ──
  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);

    // Intercept pushState (Next.js router uses this for navigation)
    window.history.pushState = function (
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) {
      if (isDirtyRef.current && url) {
        pendingUrl.current = url.toString();
        setShowWarning(true);
        return; // block navigation
      }
      originalPushState(data, unused, url);
    };

    // Intercept browser back/forward
    function onPopState() {
      if (isDirtyRef.current) {
        // Push the current URL back to cancel the back navigation
        const currentUrl = window.location.href;
        originalPushState(null, '', currentUrl);
        pendingUrl.current = null; // back button destination is unknown
        setShowWarning(true);
      }
    }

    window.addEventListener('popstate', onPopState);

    return () => {
      window.history.pushState = originalPushState;
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // ── Notify tab guard of dirty state changes ──
  useEffect(() => {
    if (_globalDirtyCallback) {
      _globalDirtyCallback(isDirty);
    }
    return () => {
      if (_globalDirtyCallback) {
        _globalDirtyCallback(false);
      }
    };
  }, [isDirty]);

  const navigateAway = useCallback(() => {
    if (pendingUrl.current) {
      window.location.href = pendingUrl.current;
    }
    pendingUrl.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setShowWarning(false);
    pendingUrl.current = null;
  }, []);

  const handleDiscard = useCallback(() => {
    setShowWarning(false);
    navigateAway();
  }, [navigateAway]);

  const handleSaveAndLeave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave();
      setShowWarning(false);
      navigateAway();
    } catch {
      setSaving(false);
    }
  }, [onSave, navigateAway]);

  return {
    showWarning,
    handleDiscard,
    handleSaveAndLeave,
    handleCancel,
    saving,
  };
}
