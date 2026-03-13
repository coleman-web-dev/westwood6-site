'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { BellIcon, FileSignature, CalendarCheck, CheckCheck, Vote, Users } from 'lucide-react';
import { SignedAgreementViewer } from '@/components/amenities/signed-agreement-viewer';
import type { Notification, NotificationType } from '@/lib/types/database';

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  agreement_signed: <FileSignature className="h-4 w-4 text-secondary-500" />,
  reservation_created: <CalendarCheck className="h-4 w-4 text-primary-500" />,
  reservation_approved: <CalendarCheck className="h-4 w-4 text-green-500" />,
  reservation_denied: <CalendarCheck className="h-4 w-4 text-red-500" />,
  ballot_created: <Vote className="h-4 w-4 text-secondary-500" />,
  ballot_opened: <Vote className="h-4 w-4 text-green-500" />,
  ballot_reminder: <Vote className="h-4 w-4 text-amber-500" />,
  ballot_closed: <Vote className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />,
  ballot_results: <Vote className="h-4 w-4 text-primary-500" />,
  proxy_requested: <Users className="h-4 w-4 text-secondary-500" />,
  proxy_granted: <Users className="h-4 w-4 text-green-500" />,
  general: <BellIcon className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />,
};

const BALLOT_NOTIFICATION_TYPES: NotificationType[] = [
  'ballot_created', 'ballot_opened', 'ballot_reminder', 'ballot_closed', 'ballot_results',
];

const RESERVATION_NOTIFICATION_TYPES: NotificationType[] = [
  'reservation_created', 'reservation_approved', 'reservation_denied',
];

export function NotificationBell() {
  const router = useRouter();
  const { member, community } = useCommunity();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [viewingReservationId, setViewingReservationId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!member) return;

    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const items = (data as Notification[]) ?? [];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.read).length);
  }, [member]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh when popover opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    if (!member) return;
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('member_id', member.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function handleNotificationClick(n: Notification) {
    if (!n.read) markAsRead(n.id);

    // Open the signed agreement viewer for agreement notifications
    if (n.type === 'agreement_signed' && n.reference_id && n.reference_type === 'reservation') {
      setOpen(false);
      setViewingReservationId(n.reference_id);
      return;
    }

    // Navigate to voting page for ballot notifications
    if (BALLOT_NOTIFICATION_TYPES.includes(n.type)) {
      setOpen(false);
      router.push(`/${community.slug}/voting`);
      return;
    }

    // Navigate to amenities page for reservation notifications
    if (RESERVATION_NOTIFICATION_TYPES.includes(n.type) || n.reference_type === 'reservation') {
      setOpen(false);
      router.push(`/${community.slug}/amenities`);
      return;
    }

    // Navigate to events page for event notifications
    if (n.reference_type === 'event') {
      setOpen(false);
      router.push(`/${community.slug}/events`);
      return;
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="relative p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors">
            <BellIcon className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[calc(100vw-24px)] sm:w-80 p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stroke-light dark:border-stroke-dark">
            <h3 className="text-label text-text-primary-light dark:text-text-primary-dark">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-meta">
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-[320px]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-body text-text-muted-light dark:text-text-muted-dark">
                  No notifications yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors ${
                      !n.read ? 'bg-secondary-50/50 dark:bg-secondary-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {TYPE_ICON[n.type] ?? TYPE_ICON.general}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-label truncate ${
                            !n.read
                              ? 'text-text-primary-light dark:text-text-primary-dark'
                              : 'text-text-secondary-light dark:text-text-secondary-dark'
                          }`}>
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="w-2 h-2 bg-secondary-500 rounded-full shrink-0" />
                          )}
                        </div>
                        {n.body && (
                          <p className="text-meta text-text-muted-light dark:text-text-muted-dark line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Agreement viewer dialog (opens when clicking an agreement notification) */}
      {viewingReservationId && (
        <SignedAgreementViewer
          open={!!viewingReservationId}
          onOpenChange={(isOpen) => { if (!isOpen) setViewingReservationId(null); }}
          reservationId={viewingReservationId}
        />
      )}
    </>
  );
}
