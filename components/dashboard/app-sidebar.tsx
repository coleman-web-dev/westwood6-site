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
  MessageSquare,
  Mail,
  Users,
  BookUser,
  Vote,
  BarChart3,
  Rocket,
  Settings,
  Globe,
  LogOut,
  XIcon,
  ShieldAlert,
  Ruler,
  PiggyBank,
  HardHat,
  BookOpen,
} from 'lucide-react';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { icon: LayoutDashboard, href: '/dashboard', label: 'Dashboard' },
  { icon: CreditCard, href: '/payments', label: 'Payments' },
  { icon: Wrench, href: '/maintenance', label: 'Maintenance' },
  { icon: FileText, href: '/documents', label: 'Documents' },
  { icon: Calendar, href: '/events', label: 'Events' },
  { icon: Building2, href: '/amenities', label: 'Amenities' },
  { icon: Megaphone, href: '/announcements', label: 'Announcements' },
  { icon: MessageSquare, href: '/bulletin-board', label: 'Bulletin Board' },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { community, unit, isHeadOfHousehold, isBoard, actualIsBoard, isTenant, canRead } = useCommunity();

  const onboardingComplete = !!community.theme?.onboarding?.completed_at;
  const basePath = `/${community.slug}`;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  function isActive(href: string) {
    const fullHref = `${basePath}${href}`;
    return pathname === fullHref || pathname.startsWith(`${fullHref}/`);
  }

  return (
    <aside
      className={`
        group/sidebar
        fixed top-0 left-0 z-50 h-screen
        flex flex-col
        py-4 gap-3.5
        bg-surface-light dark:bg-surface-dark
        border-r border-stroke-light dark:border-stroke-dark
        transition-[width,transform] duration-200 ease-out overflow-x-hidden
        lg:w-sidebar lg:hover:w-52 lg:translate-x-0
        ${open ? 'translate-x-0 w-52' : '-translate-x-full w-0'}
      `}
    >
      {/* Mobile close */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-3 right-3 p-2.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
      >
        <XIcon className="w-4 h-4" />
      </button>

      {/* Brand mark */}
      <Link href={basePath} className="flex items-center gap-3 px-5 mb-4">
        <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-secondary-300 to-mint flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary-900">D</span>
        </div>
        <span className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 hidden lg:block">
          DuesIQ
        </span>
        <span className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark whitespace-nowrap lg:hidden">
          DuesIQ
        </span>
      </Link>

      {/* Nav items */}
      <nav className="flex-1 min-h-0 flex flex-col gap-1 px-3 overflow-y-auto">
        {NAV_ITEMS
          .filter((item) => !(isTenant && item.href === '/payments'))
          .map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            href={`${basePath}${item.href}`}
            active={isActive(item.href)}
            label={item.label}
          />
        ))}
        {isBoard && (
          <NavItem
            icon={Mail}
            href={`${basePath}/email`}
            active={isActive('/email')}
            label="Email"
          />
        )}
        {community.theme?.voting_enabled && !isTenant && (
          <NavItem
            icon={Vote}
            href={`${basePath}/voting`}
            active={isActive('/voting')}
            label="Voting"
          />
        )}
        {(isBoard || community.tenant_permissions?.can_view_directory) && (
          <NavItem
            icon={BookUser}
            href={`${basePath}/directory`}
            active={isActive('/directory')}
            label="Directory"
          />
        )}
        {canRead('violations') && (
          <NavItem
            icon={ShieldAlert}
            href={`${basePath}/violations`}
            active={isActive('/violations')}
            label="Violations"
          />
        )}
        {community.theme?.arc_enabled && canRead('arc_requests') && (
          <NavItem
            icon={Ruler}
            href={`${basePath}/arc-requests`}
            active={isActive('/arc-requests')}
            label="ARC Requests"
          />
        )}
        {canRead('budget') && !isTenant && (
          <NavItem
            icon={PiggyBank}
            href={`${basePath}/budget`}
            active={isActive('/budget')}
            label="Budget"
          />
        )}
        {canRead('vendors') && (
          <NavItem
            icon={HardHat}
            href={`${basePath}/vendors`}
            active={isActive('/vendors')}
            label="Vendors"
          />
        )}
        {canRead('accounting') && !isTenant && (
          <NavItem
            icon={BookOpen}
            href={`${basePath}/accounting`}
            active={isActive('/accounting')}
            label="Accounting"
          />
        )}
        {canRead('reports') && !isTenant && (
          <NavItem
            icon={BarChart3}
            href={`${basePath}/reports`}
            active={isActive('/reports')}
            label="Reports"
          />
        )}
        {(isHeadOfHousehold || !!unit) && (
          <NavItem
            icon={Users}
            href={`${basePath}/household`}
            active={isActive('/household')}
            label="Household"
          />
        )}
        {actualIsBoard && !onboardingComplete && (
          <NavItem
            icon={Rocket}
            href={`${basePath}/onboarding`}
            active={isActive('/onboarding')}
            label="Setup"
          />
        )}
      </nav>

      {/* Utility items */}
      <div className="flex flex-col gap-1 px-3">
        <NavItem
          icon={Globe}
          href={`/${community.slug}`}
          active={false}
          label="Community Page"
        />
        <NavItem
          icon={Settings}
          href={`${basePath}/settings`}
          active={isActive('/settings')}
          label="Settings"
        />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 h-10 px-2.5 rounded-inner-card transition-colors text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span className="text-body whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 hidden lg:block">
            Sign out
          </span>
          <span className="text-body whitespace-nowrap lg:hidden">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  href,
  active = false,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  active?: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 h-10 shrink-0 px-2.5 rounded-inner-card transition-colors
        ${
          active
            ? 'bg-secondary-400/15 text-secondary-400'
            : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
        }
      `}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className="text-body whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 hidden lg:block">
        {label}
      </span>
      <span className="text-body whitespace-nowrap lg:hidden">
        {label}
      </span>
    </Link>
  );
}
