'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/shared/ui/alert-dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Switch } from '@/components/shared/ui/switch';
import { Collapsible, CollapsibleContent } from '@/components/shared/ui/collapsible';
import { toast } from 'sonner';
import { AMENITY_ICON_LIST } from '@/lib/amenity-icons';
import type { Amenity, BookingType } from '@/lib/types/database';

interface AmenityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingAmenity: Amenity | null;
  communityId: string;
}

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
] as const;

const TIME_OPTIONS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1 hr 30 min' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
  { value: '300', label: '5 hours' },
  { value: '360', label: '6 hours' },
  { value: '480', label: '8 hours' },
] as const;

type DayKey = (typeof DAYS)[number]['key'];

interface DayHours {
  enabled: boolean;
  open: string;
  close: string;
}

function defaultWeekdayHours(): Record<DayKey, DayHours> {
  const hours: Record<string, DayHours> = {};
  for (const d of DAYS) {
    const isWeekday = !['saturday', 'sunday'].includes(d.key);
    hours[d.key] = { enabled: isWeekday, open: '08:00', close: '20:00' };
  }
  return hours as Record<DayKey, DayHours>;
}

function hoursFromAmenity(
  raw: Record<string, { open: string; close: string }> | null,
): Record<DayKey, DayHours> {
  const base = defaultWeekdayHours();
  if (!raw) return base;

  // Start with all days disabled, then enable the ones in the record
  for (const d of DAYS) {
    base[d.key].enabled = false;
  }

  for (const [day, times] of Object.entries(raw)) {
    const key = day as DayKey;
    if (base[key]) {
      base[key] = { enabled: true, open: times.open, close: times.close };
    }
  }
  return base;
}

function hoursToRecord(
  hours: Record<DayKey, DayHours>,
): Record<string, { open: string; close: string }> | null {
  const result: Record<string, { open: string; close: string }> = {};
  let hasAny = false;
  for (const d of DAYS) {
    if (hours[d.key].enabled) {
      result[d.key] = { open: hours[d.key].open, close: hours[d.key].close };
      hasAny = true;
    }
  }
  return hasAny ? result : null;
}

export function AmenityDialog({
  open,
  onOpenChange,
  onSuccess,
  editingAmenity,
  communityId,
}: AmenityDialogProps) {
  const isEditing = editingAmenity !== null;

  // Basic info
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [hours, setHours] = useState<Record<DayKey, DayHours>>(defaultWeekdayHours);
  const [rulesText, setRulesText] = useState('');
  const [active, setActive] = useState(true);

  // Reservation config
  const [reservable, setReservable] = useState(true);
  const [bookingType, setBookingType] = useState<BookingType>('full_day');
  const [minBooking, setMinBooking] = useState('60');
  const [maxBooking, setMaxBooking] = useState('60');
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const formTouched = useRef(false);

  // Mark form as touched when any input changes
  function touch() {
    formTouched.current = true;
  }

  // Guard dialog close: show confirmation if form has been touched
  function handleOpenChange(newOpen: boolean) {
    if (!newOpen && formTouched.current) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(newOpen);
  }

  function handleConfirmClose() {
    setConfirmCloseOpen(false);
    formTouched.current = false;
    resetForm();
    onOpenChange(false);
  }

  // Pre-fill when editing, reset when creating
  useEffect(() => {
    if (editingAmenity) {
      setName(editingAmenity.name);
      setIcon(editingAmenity.icon ?? '');
      setPublicDescription(editingAmenity.public_description ?? '');
      setDescription(editingAmenity.description ?? '');
      setCapacity(editingAmenity.capacity != null ? String(editingAmenity.capacity) : '');
      setHours(hoursFromAmenity(editingAmenity.operating_hours));
      setRulesText(editingAmenity.rules_text ?? '');
      setActive(editingAmenity.active);
      setReservable(editingAmenity.reservable ?? true);
      setBookingType(editingAmenity.booking_type);
      setMinBooking(String(editingAmenity.min_booking_minutes ?? editingAmenity.slot_duration_minutes ?? 60));
      setMaxBooking(String(editingAmenity.max_booking_minutes ?? editingAmenity.slot_duration_minutes ?? 60));
      setBlockedDays(editingAmenity.blocked_days ?? []);
      setFee(editingAmenity.fee ? (editingAmenity.fee / 100).toFixed(2) : '');
      setDeposit(editingAmenity.deposit ? (editingAmenity.deposit / 100).toFixed(2) : '');
      setRequiresPayment(editingAmenity.requires_payment);
      setAutoApprove(editingAmenity.auto_approve);
    } else {
      resetForm();
    }
  }, [editingAmenity, open]);

  function resetForm() {
    setName('');
    setIcon('');
    setPublicDescription('');
    setDescription('');
    setCapacity('');
    setHours(defaultWeekdayHours());
    setRulesText('');
    setActive(true);
    setReservable(true);
    setBookingType('full_day');
    setMinBooking('60');
    setMaxBooking('60');
    setBlockedDays([]);
    setFee('');
    setDeposit('');
    setRequiresPayment(false);
    setAutoApprove(true);
    formTouched.current = false;
  }

  // Auto-adjust max booking when min changes
  useEffect(() => {
    const min = parseInt(minBooking, 10);
    const max = parseInt(maxBooking, 10);
    if (!isNaN(min) && !isNaN(max) && max < min) {
      setMaxBooking(minBooking);
    }
  }, [minBooking, maxBooking]);

  // Auto-set requires_payment when fee changes
  useEffect(() => {
    const feeVal = parseFloat(fee);
    if (!isNaN(feeVal) && feeVal > 0) {
      setRequiresPayment(true);
    }
  }, [fee]);

  function updateDay(day: DayKey, patch: Partial<DayHours>) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  }

  function applyToAll(sourceDay: DayKey) {
    const source = hours[sourceDay];
    setHours((prev) => {
      const updated = { ...prev };
      for (const d of DAYS) {
        if (updated[d.key].enabled) {
          updated[d.key] = { ...updated[d.key], open: source.open, close: source.close };
        }
      }
      return updated;
    });
    toast.success('Hours applied to all enabled days.');
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Amenity name is required.');
      return;
    }

    const feeCents = reservable ? Math.round(parseFloat(fee || '0') * 100) : 0;
    const depositCents = reservable ? Math.round(parseFloat(deposit || '0') * 100) : 0;
    const capacityNum = capacity ? parseInt(capacity, 10) : null;

    if (reservable && (isNaN(feeCents) || feeCents < 0)) {
      toast.error('Fee must be a valid dollar amount.');
      return;
    }
    if (reservable && (isNaN(depositCents) || depositCents < 0)) {
      toast.error('Deposit must be a valid dollar amount.');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      const hasTimeSlots = reservable && bookingType !== 'full_day';

      const payload = {
        name: trimmedName,
        icon: icon || null,
        public_description: publicDescription.trim() || null,
        description: description.trim() || null,
        capacity: capacityNum,
        operating_hours: hoursToRecord(hours),
        rules_text: rulesText.trim() || null,
        active,
        reservable,
        booking_type: reservable ? bookingType : 'full_day',
        slot_duration_minutes: hasTimeSlots ? 30 : null,
        min_booking_minutes: hasTimeSlots ? parseInt(minBooking, 10) : null,
        max_booking_minutes: hasTimeSlots ? parseInt(maxBooking, 10) : null,
        blocked_days: reservable ? blockedDays : [],
        fee: feeCents,
        deposit: depositCents,
        requires_payment: reservable ? requiresPayment : false,
        auto_approve: reservable ? autoApprove : true,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('amenities')
          .update(payload)
          .eq('id', editingAmenity.id);

        setSubmitting(false);

        if (error) {
          console.error('Amenity update error:', error);
          toast.error(`Failed to update amenity: ${error.message}`);
          return;
        }

        toast.success('Amenity updated.');
      } else {
        const { error } = await supabase.from('amenities').insert({
          ...payload,
          community_id: communityId,
        });

        setSubmitting(false);

        if (error) {
          console.error('Amenity create error:', error);
          toast.error(`Failed to create amenity: ${error.message}`);
          return;
        }

        toast.success('Amenity created.');
      }

      formTouched.current = false;
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setSubmitting(false);
      console.error('Amenity submit error:', err);
      toast.error('An unexpected error occurred. Check the browser console for details.');
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-xl max-h-[85vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (formTouched.current) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (formTouched.current) {
            e.preventDefault();
            setConfirmCloseOpen(true);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Amenity' : 'New Amenity'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this amenity\'s details and reservation settings.'
              : 'Add an amenity to your community directory. Enable reservations to let members book it.'}
          </DialogDescription>
        </DialogHeader>

        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div className="space-y-4 py-2" onChangeCapture={touch}>
          {/* ── BASIC INFO ── */}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Name
            </label>
            <Input
              placeholder="e.g. Pool, Clubhouse, Tennis Court"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Icon
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AMENITY_ICON_LIST.map((item) => {
                const Icon = item.icon;
                const isSelected = icon === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    title={item.label}
                    onClick={() => { touch(); setIcon(isSelected ? '' : item.key); }}
                    className={`w-9 h-9 flex items-center justify-center rounded-inner-card border transition-colors ${
                      isSelected
                        ? 'bg-secondary-400/15 border-secondary-400 text-secondary-500 dark:text-secondary-400'
                        : 'bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark text-text-muted-light dark:text-text-muted-dark hover:border-secondary-400/50 hover:text-text-primary-light dark:hover:text-text-primary-dark'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Public description */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Public description
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Shown on your community's public landing page. Visible to visitors and prospective residents.
            </p>
            <Textarea
              placeholder="Brief description for the public site..."
              value={publicDescription}
              onChange={(e) => setPublicDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Community description */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Community description
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Shown to logged-in members on the amenities page. Include usage instructions or internal notes.
            </p>
            <Textarea
              placeholder="Details, instructions, or notes for members..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Capacity
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <Input
              type="number"
              min={1}
              placeholder="Max number of people"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* ── OPERATING HOURS (always visible) ── */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Hours
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Set the hours this amenity is open. Displayed to members and on the public landing page.
            </p>
            <div className="space-y-2">
              {DAYS.map((d) => (
                <div key={d.key} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 w-16 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hours[d.key].enabled}
                      onChange={(e) =>
                        updateDay(d.key, { enabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                      {d.label}
                    </span>
                  </label>
                  {hours[d.key].enabled && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={hours[d.key].open}
                        onChange={(e) =>
                          updateDay(d.key, { open: e.target.value })
                        }
                        className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        to
                      </span>
                      <input
                        type="time"
                        value={hours[d.key].close}
                        onChange={(e) =>
                          updateDay(d.key, { close: e.target.value })
                        }
                        className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <button
                        type="button"
                        onClick={() => applyToAll(d.key)}
                        className="text-meta text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 whitespace-nowrap ml-1"
                      >
                        Apply to all
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── RESERVABLE TOGGLE ── */}
          <div className="border-t border-stroke-light dark:border-stroke-dark pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                  Allow reservations
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Enable to let members book this amenity through the portal
                </p>
              </div>
              <Switch checked={reservable} onCheckedChange={(v) => { touch(); setReservable(v); }} />
            </div>
          </div>

          {/* ── RESERVATION SETTINGS (collapsible) ── */}
          <Collapsible open={reservable}>
            <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="space-y-4 pt-1">
                {/* Booking type */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Booking type
                  </label>
                  <Select
                    value={bookingType}
                    onValueChange={(v) => { touch(); setBookingType(v as BookingType); }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_day">Full Day</SelectItem>
                      <SelectItem value="time_slot">Time Slot</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Time slot options (nested collapsible) */}
                <Collapsible open={bookingType === 'time_slot' || bookingType === 'both'}>
                  <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                          Min booking
                        </label>
                        <Select value={minBooking} onValueChange={(v) => { touch(); setMinBooking(v); }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                          Max booking
                        </label>
                        <Select value={maxBooking} onValueChange={(v) => { touch(); setMaxBooking(v); }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.filter((opt) => parseInt(opt.value, 10) >= parseInt(minBooking, 10)).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Blocked days of the week */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Blocked days
                    <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                      (optional)
                    </span>
                  </label>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Select days when this amenity cannot be reserved.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {DAYS.map((d) => {
                      const isBlocked = blockedDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => {
                            touch();
                            setBlockedDays((prev) =>
                              isBlocked
                                ? prev.filter((day) => day !== d.key)
                                : [...prev, d.key],
                            );
                          }}
                          className={`px-3 py-1.5 rounded-pill text-body border transition-colors ${
                            isBlocked
                              ? 'bg-primary-200 dark:bg-primary-700 border-primary-300 dark:border-primary-600 text-text-primary-light dark:text-text-primary-dark'
                              : 'bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark text-text-muted-light dark:text-text-muted-dark hover:border-primary-300 dark:hover:border-primary-600'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fee & Deposit */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Fee ($)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Deposit ($)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={deposit}
                      onChange={(e) => setDeposit(e.target.value)}
                    />
                  </div>
                </div>

                {/* Reservation switches */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                        Requires payment
                      </p>
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Collect fee before confirming reservation
                      </p>
                    </div>
                    <Switch checked={requiresPayment} onCheckedChange={(v) => { touch(); setRequiresPayment(v); }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                        Auto-approve reservations
                      </p>
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Skip board review for booking requests
                      </p>
                    </div>
                    <Switch checked={autoApprove} onCheckedChange={(v) => { touch(); setAutoApprove(v); }} />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ── BOTTOM FIELDS ── */}

          {/* Rules */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Rules
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <Textarea
              placeholder="Any rules or guidelines for this amenity..."
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Active (edit only) */}
          {isEditing && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                  Active
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Visible in the directory and available for use
                </p>
              </div>
              <Switch checked={active} onCheckedChange={(v) => { touch(); setActive(v); }} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting
              ? isEditing
                ? 'Saving...'
                : 'Creating...'
              : isEditing
                ? 'Save Changes'
                : 'Create Amenity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Unsaved changes confirmation */}
    <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to close without saving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirmClose}>
            Discard changes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
