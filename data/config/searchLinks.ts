export const searchLinks: Array<{
  id: string;
  name: string;
  keywords: string;
  shortcut?: string[];
  section: string;
  href: string;
}> = [
  { id: 'dashboard', name: 'Dashboard', keywords: 'home overview', section: 'Navigation', href: '/dashboard' },
  { id: 'payments', name: 'Payments', keywords: 'invoices dues billing', section: 'Navigation', href: '/payments' },
  { id: 'maintenance', name: 'Maintenance', keywords: 'requests repairs issues', section: 'Navigation', href: '/maintenance' },
  { id: 'documents', name: 'Documents', keywords: 'files upload rules', section: 'Navigation', href: '/documents' },
  { id: 'events', name: 'Events', keywords: 'calendar schedule', section: 'Navigation', href: '/events' },
  { id: 'amenities', name: 'Amenities', keywords: 'reserve book pool clubhouse', section: 'Navigation', href: '/amenities' },
  { id: 'announcements', name: 'Announcements', keywords: 'news updates notices', section: 'Navigation', href: '/announcements' },
  { id: 'bulletin-board', name: 'Bulletin Board', keywords: 'posts community forum', section: 'Navigation', href: '/bulletin-board' },
  { id: 'voting', name: 'Voting', keywords: 'ballots elections polls', section: 'Navigation', href: '/voting' },
  { id: 'settings', name: 'Settings', keywords: 'preferences configuration profile', section: 'Navigation', href: '/settings' },
  { id: 'household', name: 'Household', keywords: 'family members unit', section: 'Navigation', href: '/household' },
  { id: 'directory', name: 'Directory', keywords: 'members residents contacts', section: 'Navigation', href: '/directory' },
  { id: 'reports', name: 'Reports', keywords: 'analytics data charts financial', section: 'Navigation', href: '/reports' },
  { id: 'violations', name: 'Violations', keywords: 'compliance enforcement notice', section: 'Navigation', href: '/violations' },
  { id: 'arc-requests', name: 'ARC Requests', keywords: 'arc architectural review modifications', section: 'Navigation', href: '/arc-requests' },
  { id: 'budget', name: 'Budget', keywords: 'financial planning reserves income expenses', section: 'Navigation', href: '/budget' },
  { id: 'vendors', name: 'Vendors', keywords: 'contractors service providers', section: 'Navigation', href: '/vendors' },
];
