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
  XIcon,
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
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { community, isHeadOfHousehold } = useCommunity();
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
        fixed lg:sticky top-0 left-0 z-50 h-screen
        w-sidebar flex flex-col items-center
        py-4 gap-3.5
        bg-surface-light dark:bg-surface-dark
        border-r border-stroke-light dark:border-stroke-dark
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Mobile close */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-3 right-3 p-1 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
      >
        <XIcon className="w-4 h-4" />
      </button>

      {/* Brand mark */}
      <Link href={basePath} className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary-300 to-mint flex items-center justify-center mb-4">
        <span className="text-[10px] font-bold text-primary-900">D</span>
      </Link>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <NavIcon
            key={item.href}
            icon={item.icon}
            href={`${basePath}${item.href}`}
            active={isActive(item.href)}
            label={item.label}
          />
        ))}
        {isHeadOfHousehold && (
          <NavIcon
            icon={Users}
            href={`${basePath}/household`}
            active={isActive('/household')}
            label="Household"
          />
        )}
      </nav>

      {/* Utility icons */}
      <div className="flex flex-col items-center gap-1">
        <NavIcon
          icon={Globe}
          href={`/${community.slug}`}
          active={false}
          label="Community Page"
        />
        <NavIcon
          icon={Settings}
          href={`${basePath}/settings`}
          active={isActive('/settings')}
          label="Settings"
        />
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="w-11 h-11 flex items-center justify-center rounded-inner-card transition-colors text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>
    </aside>
  );
}

function NavIcon({
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
      title={label}
      className={`
        w-11 h-11 flex items-center justify-center rounded-inner-card transition-colors
        ${
          active
            ? 'bg-secondary-400/15 text-secondary-400'
            : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
        }
      `}
    >
      <Icon className="w-[18px] h-[18px]" />
    </Link>
  );
}
