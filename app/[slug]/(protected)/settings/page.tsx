'use client';

import { useCommunity } from '@/lib/providers/community-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { CommunitySettings } from '@/components/settings/community-settings';

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
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        {isBoard && (
          <TabsContent value="community">
            <CommunitySettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
