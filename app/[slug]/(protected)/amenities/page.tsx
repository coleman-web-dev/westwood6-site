'use client';

import { useState, useCallback } from 'react';
import { startOfMonth, endOfMonth, addMonths, startOfDay, endOfDay } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { AmenitySelector } from '@/components/amenities/amenity-selector';
import { AmenityCalendar } from '@/components/amenities/amenity-calendar';
import { TimeSlotPicker } from '@/components/amenities/time-slot-picker';
import { ReservationDialog } from '@/components/amenities/reservation-dialog';
import { MyReservations } from '@/components/amenities/my-reservations';
import type { Amenity, BlockedDateRange } from '@/lib/types/database';

export default function AmenitiesPage() {
  const { isBoard } = useCommunity();

  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [blockedRanges, setBlockedRanges] = useState<BlockedDateRange[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch blocked dates for the visible month
  const fetchBlockedDates = useCallback(
    async (amenityId: string, month: Date) => {
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
    },
    [],
  );

  // Handle amenity selection
  function handleAmenitySelect(amenity: Amenity) {
    setSelectedAmenity(amenity);
    setSelectedDate(null);
    setSelectedSlot(null);
    fetchBlockedDates(amenity.id, new Date());
  }

  // Handle calendar date click
  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);

    if (selectedAmenity?.booking_type === 'full_day') {
      setDialogOpen(true);
    }
  }

  // Handle time slot selection
  function handleSlotSelect(start: Date, end: Date) {
    setSelectedSlot({ start, end });
    setDialogOpen(true);
  }

  // Handle month navigation
  function handleMonthChange(month: Date) {
    if (selectedAmenity) {
      fetchBlockedDates(selectedAmenity.id, month);
    }
  }

  // After successful booking
  function handleReservationSuccess() {
    setSelectedDate(null);
    setSelectedSlot(null);
    setRefreshKey((k) => k + 1);
    if (selectedAmenity) {
      fetchBlockedDates(selectedAmenity.id, new Date());
    }
  }

  // Compute dialog dates
  const dialogStart = selectedSlot?.start ?? (selectedDate ? startOfDay(selectedDate) : new Date());
  const dialogEnd = selectedSlot?.end ?? (selectedDate ? endOfDay(selectedDate) : new Date());

  return (
    <div className="space-y-6">
      <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
        Amenities
      </h1>

      {/* Amenity selector */}
      <AmenitySelector
        selectedId={selectedAmenity?.id ?? null}
        onSelect={handleAmenitySelect}
      />

      {/* Main content */}
      {selectedAmenity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Calendar */}
          <div>
            <AmenityCalendar
              amenity={selectedAmenity}
              blockedRanges={blockedRanges}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              loading={calendarLoading}
            />
          </div>

          {/* Right column: Info + time slots */}
          <div className="space-y-6">
            {/* Amenity info card */}
            <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
              <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                {selectedAmenity.name}
              </h2>

              {selectedAmenity.description && (
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                  {selectedAmenity.description}
                </p>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-body">
                {selectedAmenity.capacity && (
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Capacity: </span>
                    <span className="text-text-primary-light dark:text-text-primary-dark">{selectedAmenity.capacity}</span>
                  </div>
                )}
                {selectedAmenity.fee > 0 && (
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Fee: </span>
                    <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">
                      ${(selectedAmenity.fee / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedAmenity.deposit > 0 && (
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">Deposit: </span>
                    <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">
                      ${(selectedAmenity.deposit / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-text-muted-light dark:text-text-muted-dark">Booking: </span>
                  <span className="text-text-primary-light dark:text-text-primary-dark">
                    {selectedAmenity.booking_type === 'full_day' ? 'Full day' : `${selectedAmenity.slot_duration_minutes ?? 60}-min slots`}
                  </span>
                </div>
              </div>

              {selectedAmenity.rules_text && (
                <div className="pt-2 border-t border-stroke-light dark:border-stroke-dark">
                  <h3 className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-1">
                    Rules
                  </h3>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark whitespace-pre-line">
                    {selectedAmenity.rules_text}
                  </p>
                </div>
              )}
            </div>

            {/* Time slot picker (only for time_slot amenities when date selected) */}
            {selectedAmenity.booking_type === 'time_slot' && selectedDate && (
              <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
                <TimeSlotPicker
                  amenity={selectedAmenity}
                  selectedDate={selectedDate}
                  blockedRanges={blockedRanges}
                  selectedSlot={selectedSlot}
                  onSlotSelect={handleSlotSelect}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Reservations */}
      <div className="space-y-3">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          {isBoard ? 'All Reservations' : 'My Reservations'}
        </h2>
        <MyReservations
          amenityId={selectedAmenity?.id ?? undefined}
          refreshKey={refreshKey}
        />
      </div>

      {/* Reservation dialog */}
      {selectedAmenity && (
        <ReservationDialog
          amenity={selectedAmenity}
          startDate={dialogStart}
          endDate={dialogEnd}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleReservationSuccess}
        />
      )}
    </div>
  );
}
