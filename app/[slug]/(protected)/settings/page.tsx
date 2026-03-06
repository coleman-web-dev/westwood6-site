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

export default function SettingsPage() {
  const { isBoard } = useCommunity();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const validTabs = ['profile', 'security', 'community', 'landing', 'audit'];
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
          {isBoard && <TabsTrigger value="community">Community</TabsTrigger>}
          {isBoard && <TabsTrigger value="landing">Landing Page</TabsTrigger>}
          {isBoard && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
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

        {isBoard && (
          <TabsContent value="community">
            <CommunitySettings />
          </TabsContent>
        )}

        {isBoard && (
          <TabsContent value="landing">
            <LandingPageSettings />
          </TabsContent>
        )}

        {isBoard && (
          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
