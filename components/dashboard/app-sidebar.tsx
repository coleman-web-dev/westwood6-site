'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  CreditCard,
  Wrench,
  FileText,
  Calendar,
  Building2,
  Megaphone,
  Users,
  Settings,
  Globe,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/shared/ui/sidebar';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Payments', icon: CreditCard, href: '/payments' },
  { label: 'Maintenance', icon: Wrench, href: '/maintenance' },
  { label: 'Documents', icon: FileText, href: '/documents' },
  { label: 'Events', icon: Calendar, href: '/events' },
  { label: 'Amenities', icon: Building2, href: '/amenities' },
  { label: 'Announcements', icon: Megaphone, href: '/announcements' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { community, member, isHeadOfHousehold } = useCommunity();
  const basePath = `/${community.slug}`;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href={basePath} className="flex items-center gap-2">
          {community.logo_url && (
            <img
              src={community.logo_url}
              alt=""
              className="h-7 w-7 rounded-full object-cover shrink-0"
            />
          )}
          <span className="font-display font-bold text-sm truncate">
            {community.name}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const fullHref = `${basePath}${item.href}`;
                const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={fullHref}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {isHeadOfHousehold && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(`${basePath}/household`)}
                    tooltip="Household"
                  >
                    <Link href={`${basePath}/household`}>
                      <Users />
                      <span>Household</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Community Page">
                  <Link href={`/${community.slug}`}>
                    <Globe />
                    <span>Community Page</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(`${basePath}/settings`)}
                  tooltip="Settings"
                >
                  <Link href={`${basePath}/settings`}>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-label truncate">
            {member?.first_name} {member?.last_name}
          </span>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
