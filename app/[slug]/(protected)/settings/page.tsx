'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCommunity } from '@/lib/providers/community-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/shared/ui/alert-dialog';
import { Button } from '@/components/shared/ui/button';
import { registerSettingsTabGuard } from '@/lib/hooks/use-unsaved-changes';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { EmailPreferences } from '@/components/settings/email-preferences';
import { CommunitySettings } from '@/components/settings/community-settings';
import { LandingPageSettings } from '@/components/settings/landing-page-settings';
import { MfaSettings } from '@/components/settings/mfa-settings';
import { AuditLogViewer } from '@/components/settings/audit-log-viewer';
import { RolePermissionsManager } from '@/components/settings/role-permissions-manager';
import { CommunitiesManager } from '@/components/settings/communities-manager';
import { EmailSettingsSection } from '@/components/settings/email-settings-section';
import { PendingSignupRequests } from '@/components/settings/pending-signup-requests';

export default function SettingsPage() {
  const { canWrite, canRead, isSuperAdmin } = useCommunity();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const validTabs = ['profile', 'security', 'community', 'email', 'landing', 'roles', 'requests', 'audit', 'communities'];
  const defaultTab =
    tabParam && validTabs.includes(tabParam) ? tabParam : 'profile';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isDirty, setIsDirty] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Register this page's dirty state handler so useUnsavedChanges can notify us
  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  useEffect(() => {
    const unregister = registerSettingsTabGuard(handleDirtyChange);
    return unregister;
  }, [handleDirtyChange]);

  function handleTabChange(newTab: string) {
    if (isDirty) {
      setPendingTab(newTab);
      setShowWarning(true);
    } else {
      setActiveTab(newTab);
    }
  }

  function handleDiscard() {
    setShowWarning(false);
    setIsDirty(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  }

  function handleCancel() {
    setShowWarning(false);
    setPendingTab(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
        Settings
      </h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {canRead('settings') && <TabsTrigger value="community">Community</TabsTrigger>}
          {canWrite('settings') && <TabsTrigger value="email">Email</TabsTrigger>}
          {canRead('settings') && <TabsTrigger value="landing">Landing Page</TabsTrigger>}
          {canWrite('settings') && <TabsTrigger value="roles">Roles</TabsTrigger>}
          {canWrite('members') && <TabsTrigger value="requests">Requests</TabsTrigger>}
          {canRead('settings') && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="communities">Communities</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-6">
            <ProfileSettings />
            <EmailPreferences />
          </div>
        </TabsContent>

        <TabsContent value="security">
          <MfaSettings />
        </TabsContent>

        {canRead('settings') && (
          <TabsContent value="community">
            <CommunitySettings />
          </TabsContent>
        )}

        {canWrite('settings') && (
          <TabsContent value="email">
            <EmailSettingsSection />
          </TabsContent>
        )}

        {canRead('settings') && (
          <TabsContent value="landing">
            <LandingPageSettings />
          </TabsContent>
        )}

        {canWrite('settings') && (
          <TabsContent value="roles">
            <RolePermissionsManager />
          </TabsContent>
        )}

        {canWrite('members') && (
          <TabsContent value="requests">
            <PendingSignupRequests />
          </TabsContent>
        )}

        {canRead('settings') && (
          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="communities">
            <CommunitiesManager />
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={showWarning} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave this tab, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Stay</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDiscard}>
                Discard Changes
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
