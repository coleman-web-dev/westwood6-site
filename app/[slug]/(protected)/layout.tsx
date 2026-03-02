'use client';

import { useCommunity } from '@/lib/providers/community-provider';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/shared/ui/sidebar';
import Link from 'next/link';
import { Button } from '@/components/shared/ui/button';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member, community } = useCommunity();

  if (!member) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas-light dark:bg-canvas-dark p-4">
        <h1 className="text-page-title">Access Pending</h1>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark text-center max-w-md">
          Your account is pending approval by the community board. You will be notified when access is granted.
        </p>
        <Link href={`/${community.slug}`}>
          <Button variant="outline">Back to community page</Button>
        </Link>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-canvas-light dark:bg-canvas-dark">
        <DashboardTopbar />
        <div className="flex-1 p-app-padding">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
