'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar';
import { SearchProviderWrapper } from '@/components/search/search-provider-wrapper';
import Link from 'next/link';
import { Button } from '@/components/shared/ui/button';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member, community } = useCommunity();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <SearchProviderWrapper>
      <div className="min-h-screen flex">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-sidebar">
          <DashboardTopbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-3 sm:p-app-padding">
            {children}
          </main>
        </div>
      </div>
    </SearchProviderWrapper>
  );
}
