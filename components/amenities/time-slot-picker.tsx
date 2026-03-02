'use client';

import { useMemo } from 'react';
import { format, setHours, setMinutes, isBefore, isAfter, startOfDay } from 'date-fns';
import type { Amenity, BlockedDateRange } from '@/lib/types/database';

interface TimeSlotPickerProps {
  amenity: Amenity;
  selectedDate: Date;
  blockedRanges: BlockedDateRange[];
  selectedSlot: { start: Date; end: Date } | null;
  onSlotSelect: (start: Date, end: Date) => void;
}

const DEFAULT_HOURS = { open: '08:00', close: '20:00' };

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

export function TimeSlotPicker({
  amenity,
  selectedDate,
  blockedRanges,
  selectedSlot,
  onSlotSelect,
}: TimeSlotPickerProps) {
  const duration = amenity.slot_duration_minutes ?? 60;

  const slots = useMemo(() => {
    // Get operating hours for this day of week
    const dayName = format(selectedDate, 'EEEE').toLowerCase();
    const hours = (amenity.operating_hours as Record<string, { open: string; close: string }> | null)?.[dayName] ?? DEFAULT_HOURS;

    const open = parseTime(hours.open);
    const close = parseTime(hours.close);

    const dayStart = setMinutes(setHours(startOfDay(selectedDate), open.hours), open.minutes);
    const dayEnd = setMinutes(setHours(startOfDay(selectedDate), close.hours), close.minutes);

    const result: { start: Date; end: Date; blocked: boolean }[] = [];
    let current = dayStart;

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + duration * 60 * 1000);
      if (slotEnd > dayEnd) break;

      // Check if this slot overlaps with any blocked range
      const blocked = blockedRanges.some((range) => {
        const rangeStart = new Date(range.start_datetime);
        const rangeEnd = new Date(range.end_datetime);
        return current < rangeEnd && slotEnd > rangeStart;
      });

      result.push({ start: new Date(current), end: slotEnd, blocked });
      current = slotEnd;
    }

    return result;
  }, [selectedDate, amenity.operating_hours, amenity.slot_duration_minutes, blockedRanges, duration]);

  if (slots.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No time slots available for this day.
      </p>
    );
  }

  const availableCount = slots.filter((s) => !s.blocked).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          {format(selectedDate, 'EEEE, MMM d')}
        </h4>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
          {availableCount} of {slots.length} available
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots.map((slot) => {
          const isSelected =
            selectedSlot &&
            slot.start.getTime() === selectedSlot.start.getTime();
          const now = new Date();
          const isPast = isBefore(slot.start, now);
          const isDisabled = slot.blocked || isPast;

          return (
            <button
              key={slot.start.toISOString()}
              onClick={() => {
                if (!isDisabled) onSlotSelect(slot.start, slot.end);
              }}
              disabled={isDisabled}
              className={`
                h-10 rounded-inner-card text-label transition-colors
                ${
                  isDisabled
                    ? 'bg-primary-100 dark:bg-primary-800/50 text-text-muted-light dark:text-text-muted-dark cursor-not-allowed opacity-50'
                    : isSelected
                      ? 'border-2 border-secondary-400 bg-secondary-50 dark:bg-secondary-900/30 text-secondary-500 dark:text-secondary-400'
                      : 'bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark text-text-primary-light dark:text-text-primary-dark hover:border-secondary-400/50 cursor-pointer'
                }
              `}
            >
              {format(slot.start, 'h:mm a')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
