'use client';

import { useCommunity } from '@/lib/providers/community-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { EmailPreferences } from '@/components/settings/email-preferences';
import { CommunitySettings } from '@/components/settings/community-settings';
import { LandingPageSettings } from '@/components/settings/landing-page-settings';

export default function SettingsPage() {
  const { isBoard } = useCommunity();

  return (
    <div className="space-y-6">
      <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
        Settings
      </h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isBoard && <TabsTrigger value="community">Community</TabsTrigger>}
          {isBoard && <TabsTrigger value="landing">Landing Page</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-6">
            <ProfileSettings />
            <EmailPreferences />
          </div>
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
      </Tabs>
    </div>
  );
}
