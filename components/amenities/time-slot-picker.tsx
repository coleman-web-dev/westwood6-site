'use client';

import { useMemo, useState } from 'react';
import { format, setHours, setMinutes, isBefore, startOfDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
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

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? '1 hour' : `${h} hours`;
  return `${h} hr ${m} min`;
}

export function TimeSlotPicker({
  amenity,
  selectedDate,
  blockedRanges,
  selectedSlot,
  onSlotSelect,
}: TimeSlotPickerProps) {
  const slotDuration = amenity.slot_duration_minutes ?? 60;
  const minBooking = amenity.min_booking_minutes ?? slotDuration;
  const maxBooking = amenity.max_booking_minutes ?? slotDuration;
  const hasDurationPicker = minBooking !== maxBooking;

  const [pendingStart, setPendingStart] = useState<Date | null>(null);

  // Generate base time slots for the day
  const slots = useMemo(() => {
    const dayName = format(selectedDate, 'EEEE').toLowerCase();
    const hours =
      (amenity.operating_hours as Record<string, { open: string; close: string }> | null)?.[
        dayName
      ] ?? DEFAULT_HOURS;

    const open = parseTime(hours.open);
    const close = parseTime(hours.close);

    const dayStart = setMinutes(
      setHours(startOfDay(selectedDate), open.hours),
      open.minutes,
    );
    const dayEnd = setMinutes(
      setHours(startOfDay(selectedDate), close.hours),
      close.minutes,
    );

    const result: { start: Date; end: Date; blocked: boolean }[] = [];
    let current = dayStart;

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);
      if (slotEnd > dayEnd) break;

      const blocked = blockedRanges.some((range) => {
        const rangeStart = new Date(range.start_datetime);
        const rangeEnd = new Date(range.end_datetime);
        return current < rangeEnd && slotEnd > rangeStart;
      });

      result.push({ start: new Date(current), end: slotEnd, blocked });
      current = slotEnd;
    }

    return result;
  }, [selectedDate, amenity.operating_hours, amenity.slot_duration_minutes, blockedRanges, slotDuration]);

  // Compute available durations for a given start time
  const durationOptions = useMemo(() => {
    if (!pendingStart || !hasDurationPicker) return [];

    const options: { minutes: number; available: boolean }[] = [];
    const dayName = format(selectedDate, 'EEEE').toLowerCase();
    const hours =
      (amenity.operating_hours as Record<string, { open: string; close: string }> | null)?.[
        dayName
      ] ?? DEFAULT_HOURS;
    const close = parseTime(hours.close);
    const dayEnd = setMinutes(
      setHours(startOfDay(selectedDate), close.hours),
      close.minutes,
    );

    let totalMinutes = slotDuration;
    while (totalMinutes <= maxBooking) {
      const end = new Date(pendingStart.getTime() + totalMinutes * 60 * 1000);

      // Can't extend past operating hours
      if (end > dayEnd) break;

      // Check if any slot in this range is blocked
      const hasConflict = blockedRanges.some((range) => {
        const rangeStart = new Date(range.start_datetime);
        const rangeEnd = new Date(range.end_datetime);
        return pendingStart < rangeEnd && end > rangeStart;
      });

      if (totalMinutes >= minBooking) {
        options.push({ minutes: totalMinutes, available: !hasConflict });
      }

      // If we hit a blocked slot, no further extensions are valid
      if (hasConflict) break;

      totalMinutes += slotDuration;
    }

    return options;
  }, [pendingStart, hasDurationPicker, selectedDate, amenity.operating_hours, slotDuration, minBooking, maxBooking, blockedRanges]);

  function handleSlotClick(start: Date, end: Date) {
    if (hasDurationPicker) {
      setPendingStart(start);
    } else {
      // Fixed duration: use min booking length (or slot duration if same)
      const bookingEnd = new Date(start.getTime() + minBooking * 60 * 1000);
      onSlotSelect(start, bookingEnd);
    }
  }

  function handleDurationSelect(minutes: string) {
    if (!pendingStart) return;
    const end = new Date(pendingStart.getTime() + parseInt(minutes, 10) * 60 * 1000);
    setPendingStart(null);
    onSlotSelect(pendingStart, end);
  }

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

      {/* Start time label when duration picker is active */}
      {hasDurationPicker && (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-2">
          {pendingStart ? 'Selected start time. Choose a duration below.' : 'Select a start time.'}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots.map((slot) => {
          const isPending = pendingStart && slot.start.getTime() === pendingStart.getTime();
          const isSelected =
            !hasDurationPicker &&
            selectedSlot &&
            slot.start.getTime() === selectedSlot.start.getTime();
          const now = new Date();
          const isPast = isBefore(slot.start, now);
          const isDisabled = slot.blocked || isPast;

          return (
            <button
              key={slot.start.toISOString()}
              onClick={() => {
                if (!isDisabled) handleSlotClick(slot.start, slot.end);
              }}
              disabled={isDisabled}
              className={`
                h-10 rounded-inner-card text-label transition-colors
                ${
                  isDisabled
                    ? 'bg-primary-100 dark:bg-primary-800/50 text-text-muted-light dark:text-text-muted-dark cursor-not-allowed opacity-50'
                    : isPending || isSelected
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

      {/* Duration picker */}
      {hasDurationPicker && pendingStart && durationOptions.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Duration
          </label>
          <Select onValueChange={handleDurationSelect}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((opt) => (
                <SelectItem
                  key={opt.minutes}
                  value={String(opt.minutes)}
                  disabled={!opt.available}
                >
                  {formatDuration(opt.minutes)}
                  {!opt.available && ' (unavailable)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {format(pendingStart, 'h:mm a')} start time
          </p>
        </div>
      )}

      {/* Show message when no valid durations */}
      {hasDurationPicker && pendingStart && durationOptions.length === 0 && (
        <p className="mt-4 text-body text-text-muted-light dark:text-text-muted-dark">
          No available durations from this start time. The minimum booking is{' '}
          {formatDuration(minBooking)}, but there is not enough open time remaining.
        </p>
      )}
    </div>
  );
}
