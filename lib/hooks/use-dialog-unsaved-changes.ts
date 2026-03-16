'use client';

import { useState, useRef, useCallback } from 'react';

interface UseDialogUnsavedChangesReturn {
  /** Ref-based touched flag. Set via `touch()` or `onChangeCapture={touch}`. */
  formTouched: React.MutableRefObject<boolean>;
  /** Call this on any input change to mark the form as dirty. */
  touch: () => void;
  /** Whether the "discard changes?" confirmation dialog is open. */
  confirmCloseOpen: boolean;
  /** Pass this as the Dialog's `onOpenChange`. Guards close when touched. */
  handleOpenChange: (newOpen: boolean) => void;
  /** Call this when the user confirms they want to discard changes. */
  handleConfirmClose: () => void;
  /** Pass to AlertDialog's `onOpenChange`. */
  setConfirmCloseOpen: (open: boolean) => void;
  /** Reset touched state (call after successful save). */
  resetTouched: () => void;
  /** Props to spread onto DialogContent for ESC/outside-click protection. */
  dialogContentGuardProps: {
    onInteractOutside: (e: Event) => void;
    onEscapeKeyDown: (e: KeyboardEvent) => void;
  };
}

/**
 * Hook for protecting dialog forms against accidental close when the form
 * has unsaved changes. Works by tracking a `formTouched` ref and intercepting
 * close attempts (X button, ESC, outside click) to show a confirmation dialog.
 *
 * Usage:
 * ```tsx
 * const { touch, handleOpenChange, confirmCloseOpen, ... } = useDialogUnsavedChanges({ onOpenChange });
 * <Dialog open={open} onOpenChange={handleOpenChange}>
 *   <DialogContent {...dialogContentGuardProps}>
 *     <div onChangeCapture={touch}>...</div>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export function useDialogUnsavedChanges({
  onOpenChange,
  onDiscard,
}: {
  onOpenChange: (open: boolean) => void;
  /** Optional callback when discarding (e.g. resetForm). Called before closing. */
  onDiscard?: () => void;
}): UseDialogUnsavedChangesReturn {
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const formTouched = useRef(false);

  const touch = useCallback(() => {
    formTouched.current = true;
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && formTouched.current) {
        setConfirmCloseOpen(true);
        return;
      }
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );

  const handleConfirmClose = useCallback(() => {
    setConfirmCloseOpen(false);
    formTouched.current = false;
    onDiscard?.();
    onOpenChange(false);
  }, [onOpenChange, onDiscard]);

  const resetTouched = useCallback(() => {
    formTouched.current = false;
  }, []);

  const dialogContentGuardProps = {
    onInteractOutside: (e: Event) => {
      if (formTouched.current) e.preventDefault();
    },
    onEscapeKeyDown: (e: KeyboardEvent) => {
      if (formTouched.current) {
        e.preventDefault();
        setConfirmCloseOpen(true);
      }
    },
  };

  return {
    formTouched,
    touch,
    confirmCloseOpen,
    handleOpenChange,
    handleConfirmClose,
    setConfirmCloseOpen,
    resetTouched,
    dialogContentGuardProps,
  };
}
