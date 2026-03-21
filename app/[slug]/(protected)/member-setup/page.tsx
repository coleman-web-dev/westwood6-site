'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCommunity } from '@/lib/providers/community-provider';
import { MemberSetupWizard } from '@/components/member-setup/member-setup-wizard';

export default function MemberSetupPage() {
  const { member, community, actualIsBoard } = useCommunity();
  const router = useRouter();

  // Board members and members who already completed setup go to dashboard
  useEffect(() => {
    if (member?.setup_completed_at || actualIsBoard) {
      router.replace(`/${community.slug}/dashboard`);
    }
  }, [member, actualIsBoard, community.slug, router]);

  if (!member || member.setup_completed_at || actualIsBoard) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl py-4">
      <MemberSetupWizard />
    </div>
  );
}
