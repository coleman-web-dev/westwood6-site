'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/shared/ui/alert-dialog';
import { Button } from '@/components/shared/ui/button';
import type { UseUnsavedChangesReturn } from '@/lib/hooks/use-unsaved-changes';

export function UnsavedChangesDialog({
  showWarning,
  handleCancel,
  handleDiscard,
  handleSaveAndLeave,
  saving,
}: UseUnsavedChangesReturn) {
  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes that will be lost if you leave.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={handleDiscard}>
            Discard
          </Button>
          <Button onClick={handleSaveAndLeave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Leave'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
