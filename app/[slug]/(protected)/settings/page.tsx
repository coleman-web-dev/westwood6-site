'use client';

import { useSearchParams } from 'next/navigation';
import { useCommunity } from '@/lib/providers/community-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { EmailPreferences } from '@/components/settings/email-preferences';
import { CommunitySettings } from '@/components/settings/community-settings';
import { LandingPageSettings } from '@/components/settings/landing-page-settings';
import { MfaSettings } from '@/components/settings/mfa-settings';
import { AuditLogViewer } from '@/components/settings/audit-log-viewer';
import { RolePermissionsManager } from '@/components/settings/role-permissions-manager';
import { CommunitiesManager } from '@/components/settings/communities-manager';
import { EmailSettingsSection } from '@/components/settings/email-settings-section';

export default function SettingsPage() {
  const { canWrite, canRead, isSuperAdmin } = useCommunity();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const validTabs = ['profile', 'security', 'community', 'email', 'landing', 'roles', 'audit', 'communities'];
  const defaultTab =
    tabParam && validTabs.includes(tabParam) ? tabParam : 'profile';

  return (
    <div className="space-y-6">
      <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
        Settings
      </h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {canRead('settings') && <TabsTrigger value="community">Community</TabsTrigger>}
          {canWrite('settings') && <TabsTrigger value="email">Email</TabsTrigger>}
          {canRead('settings') && <TabsTrigger value="landing">Landing Page</TabsTrigger>}
          {canWrite('settings') && <TabsTrigger value="roles">Roles</TabsTrigger>}
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
    </div>
  );
}
