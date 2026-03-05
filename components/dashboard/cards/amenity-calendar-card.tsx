'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfDay,
  isSameDay,
  eachDayOfInterval,
  subDays,
  format,
} from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Calendar } from '@/components/shared/ui/calendar';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/shared/ui/hover-card';
import { DashboardCardShell } from './dashboard-card-shell';
import { ChevronLeftIcon, ChevronRightIcon, CalendarDays } from 'lucide-react';
import { getAmenityIcon } from '@/lib/amenity-icons';
import type { Amenity, BlockedDateRange } from '@/lib/types/database';

export function AmenityCalendarCard() {
  const { community } = useCommunity();
  const router = useRouter();

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [blockedRanges, setBlockedRanges] = useState<BlockedDateRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const [showTwoMonths, setShowTwoMonths] = useState(false);

  // Observe container width to decide 1 vs 2 months
  useEffect(() => {
    const el = calendarContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setShowTwoMonths(entry.contentRect.width >= 400);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selectedAmenity = amenities[selectedIndex] ?? null;

  // Fetch amenity list
  useEffect(() => {
    const supabase = createClient();
    async function fetchAmenities() {
      const { data } = await supabase
        .from('amenities')
        .select('*')
        .eq('community_id', community.id)
        .eq('active', true)
        .eq('reservable', true)
        .order('name', { ascending: true });

      const list = (data as Amenity[]) ?? [];
      setAmenities(list);
      setLoading(false);
    }
    fetchAmenities();
  }, [community.id]);

  // Fetch blocked dates for visible months
  const fetchBlockedDates = useCallback(async (amenityId: string, month: Date) => {
    setCalendarLoading(true);
    const supabase = createClient();
    const rangeStart = startOfMonth(month);
    const rangeEnd = endOfMonth(addMonths(month, 2));

    const { data } = await supabase.rpc('get_amenity_blocked_dates', {
      p_amenity_id: amenityId,
      p_range_start: rangeStart.toISOString(),
      p_range_end: rangeEnd.toISOString(),
    });

    setBlockedRanges((data as BlockedDateRange[]) ?? []);
    setCalendarLoading(false);
  }, []);

  // Auto-fetch when amenity changes
  const selectedAmenityId = selectedAmenity?.id;
  useEffect(() => {
    if (selectedAmenityId) {
      fetchBlockedDates(selectedAmenityId, new Date());
    }
  }, [selectedAmenityId, fetchBlockedDates]);

  // Compute blocked/event/partial day modifiers (same logic as amenity-calendar.tsx)
  const { blockedDays, eventDays, partialDays } = useMemo(() => {
    if (!selectedAmenity) return { blockedDays: [], eventDays: [], partialDays: [] };

    const blocked: Date[] = [];
    const events: Date[] = [];
    const partial: Date[] = [];

    for (const range of blockedRanges) {
      const start = new Date(range.start_datetime);
      const end = new Date(range.end_datetime);
      const days = eachDayOfInterval({
        start: startOfDay(start),
        end: startOfDay(subDays(end, end.getHours() === 0 && end.getMinutes() === 0 ? 1 : 0)),
      });

      for (const day of days) {
        if (range.block_type === 'event') {
          if (!events.some((d) => isSameDay(d, day))) events.push(day);
        }
        if (selectedAmenity.booking_type === 'full_day') {
          if (!blocked.some((d) => isSameDay(d, day))) blocked.push(day);
        } else { // time_slot or both
          if (!partial.some((d) => isSameDay(d, day))) partial.push(day);
        }
      }
    }

    return { blockedDays: blocked, eventDays: events, partialDays: partial };
  }, [blockedRanges, selectedAmenity]);

  // Map dates to event details for hover tooltips
  const eventByDate = useMemo(() => {
    const map = new Map<string, { title: string; description: string | null; start: string; end: string }[]>();
    for (const range of blockedRanges) {
      if (range.block_type !== 'event' || !range.event_title) continue;
      const start = new Date(range.start_datetime);
      const end = new Date(range.end_datetime);
      const days = eachDayOfInterval({
        start: startOfDay(start),
        end: startOfDay(subDays(end, end.getHours() === 0 && end.getMinutes() === 0 ? 1 : 0)),
      });
      for (const day of days) {
        const key = format(day, 'yyyy-MM-dd');
        const existing = map.get(key) ?? [];
        existing.push({
          title: range.event_title,
          description: range.event_description,
          start: range.start_datetime,
          end: range.end_datetime,
        });
        map.set(key, existing);
      }
    }
    return map;
  }, [blockedRanges]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const disabledDates = useMemo(() => {
    const matchers: Array<Date | { before: Date }> = [{ before: today }];
    if (selectedAmenity?.booking_type === 'full_day') {
      matchers.push(...blockedDays);
    }
    return matchers;
  }, [today, blockedDays, selectedAmenity]);

  function handleDateSelect() {
    router.push(`/${community.slug}/amenities`);
  }

  function handleMonthChange(month: Date) {
    if (selectedAmenity) {
      fetchBlockedDates(selectedAmenity.id, month);
    }
  }

  const amenitiesHref = `/${community.slug}/amenities`;

  return (
    <DashboardCardShell title="Amenity Calendar">
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-5 rounded bg-muted" />
          ))}
        </div>
      ) : amenities.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No amenities available.
        </p>
      ) : (
        <div className="flex flex-col gap-3 h-full">
          {/* Amenity switcher */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSelectedIndex((i) => (i - 1 + amenities.length) % amenities.length)}
              className="p-1 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors disabled:opacity-0"
              disabled={amenities.length <= 1}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark truncate flex items-center gap-2">
              {(() => {
                const Icon = selectedAmenity ? getAmenityIcon(selectedAmenity.icon) : null;
                return Icon ? <Icon className="w-4 h-4 shrink-0" /> : null;
              })()}
              {selectedAmenity?.name}
            </span>
            <button
              onClick={() => setSelectedIndex((i) => (i + 1) % amenities.length)}
              className="p-1 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors disabled:opacity-0"
              disabled={amenities.length <= 1}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar */}
          {selectedAmenity && (
            <div ref={calendarContainerRef} className="relative flex-1 min-h-0 flex items-start justify-center">
              {calendarLoading && (
                <div className="absolute inset-0 bg-surface-light/60 dark:bg-surface-dark/60 z-10 flex items-center justify-center rounded-inner-card">
                  <div className="animate-pulse text-body text-text-muted-light dark:text-text-muted-dark">
                    Loading...
                  </div>
                </div>
              )}
              <Calendar
                numberOfMonths={showTwoMonths ? 2 : 1}
                navLayout="around"
                classNames={{
                  months: showTwoMonths ? 'flex flex-row gap-4' : undefined,
                  month: 'flex flex-col [&>button]:absolute [&>button:first-of-type]:left-1 [&>button:last-of-type]:right-1 [&>button]:top-1 relative',
                  month_caption: 'flex justify-center py-1 relative items-center',
                  button_previous: 'absolute left-1 top-1 z-10 inline-flex items-center justify-center h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md border border-input',
                  button_next: 'absolute right-1 top-1 z-10 inline-flex items-center justify-center h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md border border-input',
                }}
                mode="single"
                onSelect={(date) => {
                  if (date) handleDateSelect();
                }}
                onMonthChange={handleMonthChange}
                disabled={disabledDates}
                modifiers={{
                  blocked: selectedAmenity.booking_type === 'full_day' ? blockedDays : [],
                  partiallyBooked: selectedAmenity.booking_type !== 'full_day' ? partialDays : [],
                  hasEvent: eventDays,
                }}
                modifiersClassNames={{
                  blocked:
                    '!bg-primary-200 dark:!bg-primary-700/50 !text-text-muted-light dark:!text-text-muted-dark !cursor-not-allowed',
                  partiallyBooked:
                    'bg-secondary-100 dark:bg-secondary-900/30 border border-secondary-300/50 dark:border-secondary-700/50',
                  hasEvent: 'bg-mint/20 dark:bg-mint/10',
                }}
                components={{
                  DayButton: ({ day, ...buttonProps }) => {
                    const dateKey = format(day.date, 'yyyy-MM-dd');
                    const dayEvents = eventByDate.get(dateKey);

                    if (dayEvents && dayEvents.length > 0) {
                      return (
                        <HoverCard openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <button {...buttonProps} />
                          </HoverCardTrigger>
                          <HoverCardContent side="top" className="w-56 p-3">
                            <div className="space-y-2">
                              {dayEvents.map((evt, i) => (
                                <div key={i}>
                                  <div className="flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5 text-mint shrink-0" />
                                    <p className="text-label text-text-primary-light dark:text-text-primary-dark leading-tight">
                                      {evt.title}
                                    </p>
                                  </div>
                                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5 ml-5">
                                    {format(new Date(evt.start), 'h:mm a')} &ndash; {format(new Date(evt.end), 'h:mm a')}
                                  </p>
                                  {evt.description && (
                                    <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark mt-1 ml-5 line-clamp-3">
                                      {evt.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      );
                    }

                    return <button {...buttonProps} />;
                  },
                }}
                className="rounded-inner-card border border-stroke-light dark:border-stroke-dark"
              />
            </div>
          )}

          {/* Footer link */}
          <Link
            href={amenitiesHref}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors mt-auto"
          >
            Reserve an amenity
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
