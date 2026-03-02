'use client';

import { useEffect, useState } from 'react';
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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('full_day');
  const [slotDuration, setSlotDuration] = useState('60');
  const [hours, setHours] = useState<Record<DayKey, DayHours>>(defaultWeekdayHours);
  const [capacity, setCapacity] = useState('');
  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [rulesText, setRulesText] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill when editing, reset when creating
  useEffect(() => {
    if (editingAmenity) {
      setName(editingAmenity.name);
      setDescription(editingAmenity.description ?? '');
      setBookingType(editingAmenity.booking_type);
      setSlotDuration(String(editingAmenity.slot_duration_minutes ?? 60));
      setHours(hoursFromAmenity(editingAmenity.operating_hours));
      setCapacity(editingAmenity.capacity != null ? String(editingAmenity.capacity) : '');
      setFee(editingAmenity.fee ? (editingAmenity.fee / 100).toFixed(2) : '');
      setDeposit(editingAmenity.deposit ? (editingAmenity.deposit / 100).toFixed(2) : '');
      setRequiresPayment(editingAmenity.requires_payment);
      setAutoApprove(editingAmenity.auto_approve);
      setRulesText(editingAmenity.rules_text ?? '');
      setActive(editingAmenity.active);
    } else {
      resetForm();
    }
  }, [editingAmenity, open]);

  function resetForm() {
    setName('');
    setDescription('');
    setBookingType('full_day');
    setSlotDuration('60');
    setHours(defaultWeekdayHours());
    setCapacity('');
    setFee('');
    setDeposit('');
    setRequiresPayment(false);
    setAutoApprove(true);
    setRulesText('');
    setActive(true);
  }

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

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Amenity name is required.');
      return;
    }

    const feeCents = Math.round(parseFloat(fee || '0') * 100);
    const depositCents = Math.round(parseFloat(deposit || '0') * 100);
    const capacityNum = capacity ? parseInt(capacity, 10) : null;

    if (isNaN(feeCents) || feeCents < 0) {
      toast.error('Fee must be a valid dollar amount.');
      return;
    }
    if (isNaN(depositCents) || depositCents < 0) {
      toast.error('Deposit must be a valid dollar amount.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      booking_type: bookingType,
      slot_duration_minutes: bookingType === 'time_slot' ? parseInt(slotDuration, 10) : null,
      operating_hours: bookingType === 'time_slot' ? hoursToRecord(hours) : null,
      capacity: capacityNum,
      fee: feeCents,
      deposit: depositCents,
      requires_payment: requiresPayment,
      auto_approve: autoApprove,
      rules_text: rulesText.trim() || null,
      active,
    };

    if (isEditing) {
      const { error } = await supabase
        .from('amenities')
        .update(payload)
        .eq('id', editingAmenity.id);

      setSubmitting(false);

      if (error) {
        toast.error('Failed to update amenity. Please try again.');
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
        toast.error('Failed to create amenity. Please try again.');
        return;
      }

      toast.success('Amenity created.');
    }

    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Amenity' : 'New Amenity'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the amenity details below.'
              : 'Define a new bookable amenity for your community.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <Textarea
              placeholder="Details about this amenity..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Booking type */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Booking type
            </label>
            <Select
              value={bookingType}
              onValueChange={(v) => setBookingType(v as BookingType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_day">Full Day</SelectItem>
                <SelectItem value="time_slot">Time Slot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time slot options (collapsible) */}
          <Collapsible open={bookingType === 'time_slot'}>
            <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="space-y-4 pt-1">
                {/* Slot duration */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Slot duration
                  </label>
                  <Select value={slotDuration} onValueChange={setSlotDuration}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                      <SelectItem value="120">120 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Operating hours */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Operating hours
                  </label>
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

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

          {/* Switches */}
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
              <Switch checked={requiresPayment} onCheckedChange={setRequiresPayment} />
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
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
            </div>

            {isEditing && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                    Active
                  </p>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Visible and available for booking
                  </p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            )}
          </div>

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
  );
}
