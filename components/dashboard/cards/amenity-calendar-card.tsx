'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Calendar } from '@/components/shared/ui/calendar';
import { DashboardCardShell } from './dashboard-card-shell';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { Amenity, BlockedDateRange } from '@/lib/types/database';

export function AmenityCalendarCard() {
  const { community } = useCommunity();
  const router = useRouter();

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [blockedRanges, setBlockedRanges] = useState<BlockedDateRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);

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
        .order('name', { ascending: true });

      const list = (data as Amenity[]) ?? [];
      setAmenities(list);
      setLoading(false);
    }
    fetchAmenities();
  }, [community.id]);

  // Fetch blocked dates for visible month
  const fetchBlockedDates = useCallback(async (amenityId: string, month: Date) => {
    setCalendarLoading(true);
    const supabase = createClient();
    const rangeStart = startOfMonth(month);
    const rangeEnd = endOfMonth(addMonths(month, 1));

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
        } else {
          if (!partial.some((d) => isSameDay(d, day))) partial.push(day);
        }
      }
    }

    return { blockedDays: blocked, eventDays: events, partialDays: partial };
  }, [blockedRanges, selectedAmenity]);

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
            <span className="text-label font-medium text-text-primary-light dark:text-text-primary-dark truncate">
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
            <div className="relative flex-1 min-h-0">
              {calendarLoading && (
                <div className="absolute inset-0 bg-surface-light/60 dark:bg-surface-dark/60 z-10 flex items-center justify-center rounded-inner-card">
                  <div className="animate-pulse text-body text-text-muted-light dark:text-text-muted-dark">
                    Loading...
                  </div>
                </div>
              )}
              <Calendar
                mode="single"
                onSelect={(date) => {
                  if (date) handleDateSelect();
                }}
                onMonthChange={handleMonthChange}
                disabled={disabledDates}
                modifiers={{
                  blocked: selectedAmenity.booking_type === 'full_day' ? blockedDays : [],
                  partiallyBooked: selectedAmenity.booking_type === 'time_slot' ? partialDays : [],
                  hasEvent: eventDays,
                }}
                modifiersClassNames={{
                  blocked:
                    '!bg-primary-200 dark:!bg-primary-700/50 !text-text-muted-light dark:!text-text-muted-dark !cursor-not-allowed',
                  partiallyBooked:
                    'bg-secondary-100 dark:bg-secondary-900/30 border border-secondary-300/50 dark:border-secondary-700/50',
                  hasEvent: 'bg-mint/20 dark:bg-mint/10',
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
