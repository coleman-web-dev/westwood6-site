'use client';

import { useMemo, useCallback } from 'react';
import { Calendar } from '@/components/shared/ui/calendar';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/shared/ui/hover-card';
import { CalendarDays } from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  isSameDay,
  isBefore,
  isWithinInterval,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  getDay,
  format,
} from 'date-fns';
import type { Amenity, BlockedDateRange } from '@/lib/types/database';

interface AmenityCalendarProps {
  amenity: Amenity;
  blockedRanges: BlockedDateRange[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onMonthChange: (month: Date) => void;
  loading: boolean;
}

export function AmenityCalendar({
  amenity,
  blockedRanges,
  selectedDate,
  onDateSelect,
  onMonthChange,
  loading,
}: AmenityCalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), []);

  // Compute which days are fully blocked
  const { blockedDays, eventDays, partialDays } = useMemo(() => {
    const blocked: Date[] = [];
    const events: Date[] = [];
    const partial: Date[] = [];

    for (const range of blockedRanges) {
      const start = new Date(range.start_datetime);
      const end = new Date(range.end_datetime);

      // Get all days this range spans
      const days = eachDayOfInterval({
        start: startOfDay(start),
        end: startOfDay(subDays(end, end.getHours() === 0 && end.getMinutes() === 0 ? 1 : 0)),
      });

      for (const day of days) {
        if (range.block_type === 'event') {
          if (!events.some((d) => isSameDay(d, day))) {
            events.push(day);
          }
        }

        if (amenity.booking_type === 'full_day') {
          if (!blocked.some((d) => isSameDay(d, day))) {
            blocked.push(day);
          }
        } else {
          // For time_slot and both amenities, check if the entire day is blocked
          // A day is only partially blocked if some slots remain
          if (!partial.some((d) => isSameDay(d, day))) {
            partial.push(day);
          }
        }
      }
    }

    // For time_slot amenities, move fully blocked days from partial to blocked
    // (this would require knowing operating_hours + slot_duration to check all slots)
    // For now, mark them all as partial - the time slot picker shows actual availability

    return { blockedDays: blocked, eventDays: events, partialDays: partial };
  }, [blockedRanges, amenity.booking_type]);

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

  // Map day names to JS day indices (0=Sun, 1=Mon, ... 6=Sat)
  const blockedDayIndices = useMemo(() => {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    return (amenity.blocked_days ?? [])
      .map((d) => dayMap[d])
      .filter((i) => i !== undefined);
  }, [amenity.blocked_days]);

  // Disabled dates: past + fully blocked + blocked days of week
  const disabledDates = useMemo(() => {
    const matchers: Array<Date | { before: Date } | ((date: Date) => boolean)> = [
      { before: today },
    ];

    if (amenity.booking_type === 'full_day') {
      matchers.push(...blockedDays);
    }

    // Block specific days of the week
    if (blockedDayIndices.length > 0) {
      matchers.push((date: Date) => blockedDayIndices.includes(getDay(date)));
    }

    return matchers;
  }, [today, blockedDays, amenity.booking_type, blockedDayIndices]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-surface-light/60 dark:bg-surface-dark/60 z-10 flex items-center justify-center rounded-panel">
          <div className="animate-pulse text-body text-text-muted-light dark:text-text-muted-dark">
            Loading...
          </div>
        </div>
      )}
      <Calendar
        mode="single"
        selected={selectedDate ?? undefined}
        onSelect={(date) => {
          if (date) onDateSelect(date);
        }}
        onMonthChange={onMonthChange}
        disabled={disabledDates}
        modifiers={{
          blocked: amenity.booking_type === 'full_day' ? blockedDays : [],
          partiallyBooked: amenity.booking_type !== 'full_day' ? partialDays : [],
          hasEvent: eventDays,
        }}
        modifiersClassNames={{
          blocked: '!bg-primary-200 dark:!bg-primary-700/50 !text-text-muted-light dark:!text-text-muted-dark !cursor-not-allowed',
          partiallyBooked: 'bg-secondary-100 dark:bg-secondary-900/30 border border-secondary-300/50 dark:border-secondary-700/50',
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
        className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
      />
    </div>
  );
}
