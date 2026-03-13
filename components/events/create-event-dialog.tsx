'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
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
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Label } from '@/components/shared/ui/label';
import { getAmenityIcon } from '@/lib/amenity-icons';
import { toast } from 'sonner';
import { sendEventNotificationEmails } from '@/lib/actions/email-actions';
import type { Amenity, Event, EventVisibility, MemberRole } from '@/lib/types/database';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingEvent: Event | null;
}

function toLocalDateString(isoString: string): string {
  return format(new Date(isoString), 'yyyy-MM-dd');
}

function toLocalTimeString(isoString: string): string {
  return format(new Date(isoString), 'HH:mm');
}

function combineDateAndTime(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}`).toISOString();
}

const NOTIFY_ROLE_OPTIONS: { role: MemberRole; label: string }[] = [
  { role: 'owner', label: 'Owners' },
  { role: 'member', label: 'Members' },
  { role: 'tenant', label: 'Tenants' },
  { role: 'minor', label: 'Minors' },
];

export function CreateEventDialog({
  open,
  onOpenChange,
  onSuccess,
  editingEvent,
}: CreateEventDialogProps) {
  const { community, member } = useCommunity();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationType, setLocationType] = useState<'none' | 'amenity' | 'other'>('none');
  const [selectedAmenityId, setSelectedAmenityId] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [blocksAmenity, setBlocksAmenity] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // New display/notification settings
  const [showOnAnnouncements, setShowOnAnnouncements] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [notifyRoles, setNotifyRoles] = useState<MemberRole[]>(['owner', 'member']);

  // RSVP settings
  const [rsvpEnabled, setRsvpEnabled] = useState(false);
  const [rsvpFee, setRsvpFee] = useState('');
  const [rsvpFeeType, setRsvpFeeType] = useState<'per_person' | 'flat'>('flat');
  const [rsvpMaxCapacity, setRsvpMaxCapacity] = useState('');
  const [rsvpAllowCancellation, setRsvpAllowCancellation] = useState(true);
  const [rsvpCancellationNoticeHours, setRsvpCancellationNoticeHours] = useState('');

  const isEditing = editingEvent !== null;

  // Fetch amenities when dialog opens
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    async function loadAmenities() {
      const { data } = await supabase
        .from('amenities')
        .select('*')
        .eq('community_id', community.id)
        .eq('active', true)
        .order('name');
      setAmenities((data as Amenity[]) ?? []);
    }
    loadAmenities();
  }, [open, community.id]);

  // Pre-fill form when editing, reset when creating
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description ?? '');
      setStartDate(toLocalDateString(editingEvent.start_datetime));
      setStartTime(toLocalTimeString(editingEvent.start_datetime));
      setEndDate(toLocalDateString(editingEvent.end_datetime));
      setEndTime(toLocalTimeString(editingEvent.end_datetime));
      setVisibility(editingEvent.visibility);
      setBlocksAmenity(editingEvent.blocks_amenity);
      setShowOnAnnouncements(editingEvent.show_on_announcements);
      setIsPinned(editingEvent.is_pinned);
      setNotifyOnCreate(false); // Don't re-send on edit
      setNotifyRoles(editingEvent.notify_roles ?? ['owner', 'member']);

      // RSVP settings
      setRsvpEnabled(editingEvent.rsvp_enabled);
      setRsvpFee(editingEvent.rsvp_fee > 0 ? (editingEvent.rsvp_fee / 100).toFixed(2) : '');
      setRsvpFeeType(editingEvent.rsvp_fee_type);
      setRsvpMaxCapacity(editingEvent.rsvp_max_capacity?.toString() ?? '');
      setRsvpAllowCancellation(editingEvent.rsvp_allow_cancellation);
      setRsvpCancellationNoticeHours(editingEvent.rsvp_cancellation_notice_hours?.toString() ?? '');

      // Determine location type from existing data
      if (editingEvent.amenity_id) {
        setLocationType('amenity');
        setSelectedAmenityId(editingEvent.amenity_id);
        setCustomLocation('');
      } else if (editingEvent.location) {
        setLocationType('other');
        setSelectedAmenityId('');
        setCustomLocation(editingEvent.location);
      } else {
        setLocationType('none');
        setSelectedAmenityId('');
        setCustomLocation('');
      }
    } else {
      resetForm();
    }
  }, [editingEvent, open]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setLocationType('none');
    setSelectedAmenityId('');
    setCustomLocation('');
    setBlocksAmenity(true);
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setVisibility('public');
    setShowOnAnnouncements(true);
    setIsPinned(false);
    setNotifyOnCreate(true);
    setNotifyRoles(['owner', 'member']);
    setRsvpEnabled(false);
    setRsvpFee('');
    setRsvpFeeType('flat');
    setRsvpMaxCapacity('');
    setRsvpAllowCancellation(true);
    setRsvpCancellationNoticeHours('');
  }

  // Auto-set end date/time to 1 hour after start when start changes
  function handleStartDateChange(date: string) {
    setStartDate(date);
    // If end date isn't set yet, default it to same day
    if (!endDate) setEndDate(date);
  }

  function handleStartTimeChange(time: string) {
    setStartTime(time);
    // Auto-set end time to 1 hour later if end time isn't set or end date matches start
    if (!endTime || endDate === startDate || !endDate) {
      const [hours, minutes] = time.split(':').map(Number);
      const endHour = (hours + 1) % 24;
      const newEndTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setEndTime(newEndTime);
      // If rolling past midnight, bump end date to next day
      if (endHour < hours) {
        const nextDay = new Date(`${startDate || endDate}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        setEndDate(format(nextDay, 'yyyy-MM-dd'));
      } else if (!endDate && startDate) {
        setEndDate(startDate);
      }
    }
  }

  function toggleNotifyRole(role: MemberRole) {
    setNotifyRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function isLocationValid(): boolean {
    if (locationType === 'amenity') return !!selectedAmenityId;
    if (locationType === 'other') return !!customLocation.trim();
    return false; // 'none' is not valid since location is required
  }

  function isFormValid(): boolean {
    return !!(title.trim() && startDate && startTime && endDate && endTime && isLocationValid());
  }

  async function handleSubmit() {
    if (!isFormValid()) {
      toast.error('Title, location, start date/time, and end date/time are required.');
      return;
    }

    if (!member) return;

    const startIso = combineDateAndTime(startDate, startTime);
    const endIso = combineDateAndTime(endDate, endTime);

    if (endIso <= startIso) {
      toast.error('End date/time must be after the start date/time.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    // Derive location and amenity_id from location type
    const isAmenityLocation = locationType === 'amenity' && selectedAmenityId;
    const selectedAmenityObj = isAmenityLocation
      ? amenities.find((a) => a.id === selectedAmenityId)
      : null;

    const resolvedLocation = isAmenityLocation
      ? selectedAmenityObj?.name ?? null
      : locationType === 'other'
        ? customLocation.trim() || null
        : null;

    const rsvpFeeCents = rsvpEnabled && rsvpFee ? Math.round(parseFloat(rsvpFee) * 100) : 0;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      location: resolvedLocation,
      start_datetime: startIso,
      end_datetime: endIso,
      visibility,
      amenity_id: isAmenityLocation ? selectedAmenityId : null,
      blocks_amenity: isAmenityLocation ? blocksAmenity : false,
      show_on_announcements: showOnAnnouncements,
      is_pinned: isPinned,
      notify_on_create: notifyOnCreate,
      notify_roles: notifyRoles,
      rsvp_enabled: rsvpEnabled,
      rsvp_fee: rsvpFeeCents,
      rsvp_fee_type: rsvpFeeType,
      rsvp_max_capacity: rsvpEnabled && rsvpMaxCapacity ? parseInt(rsvpMaxCapacity) : null,
      rsvp_allow_cancellation: rsvpEnabled ? rsvpAllowCancellation : true,
      rsvp_cancellation_notice_hours: rsvpEnabled && rsvpAllowCancellation && rsvpCancellationNoticeHours
        ? parseInt(rsvpCancellationNoticeHours)
        : null,
    };

    if (isEditing) {
      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', editingEvent.id);

      setSubmitting(false);

      if (error) {
        toast.error('Failed to update event. Please try again.');
        return;
      }

      toast.success('Event updated.');
    } else {
      const { error } = await supabase.from('events').insert({
        ...payload,
        community_id: community.id,
        created_by: member.id,
      });

      setSubmitting(false);

      if (error) {
        toast.error('Failed to create event. Please try again.');
        return;
      }

      toast.success('Event created.');

      // Fire-and-forget: send notification emails
      if (notifyOnCreate && notifyRoles.length > 0) {
        sendEventNotificationEmails(
          community.id,
          community.slug,
          title.trim(),
          description.trim() || '',
          resolvedLocation || '',
          startIso,
          endIso,
          notifyRoles,
        ).then((result) => {
          if (result.success) {
            toast.success('Event notification emails queued.');
          }
        }).catch((err) => {
          console.error('Failed to queue event notification emails:', err);
        });
      }
    }

    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event' : 'New Event'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the event details below.'
              : 'Create a new community event.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title
            </label>
            <Input
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
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
              placeholder="Add details about the event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Location <span className="text-destructive">*</span>
            </label>
            <Select
              value={
                locationType === 'amenity' && selectedAmenityId
                  ? selectedAmenityId
                  : locationType === 'other'
                    ? '__other__'
                    : ''
              }
              onValueChange={(v) => {
                if (v === '__other__') {
                  setLocationType('other');
                  setSelectedAmenityId('');
                } else {
                  setLocationType('amenity');
                  setSelectedAmenityId(v);
                  setCustomLocation('');
                  setBlocksAmenity(true);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {amenities.map((a) => {
                  const Icon = getAmenityIcon(a.icon);
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-1.5">
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {a.name}
                      </span>
                    </SelectItem>
                  );
                })}
                <SelectItem value="__other__">Other (custom location)</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom location input for "Other" */}
            {locationType === 'other' && (
              <Input
                placeholder="e.g. Main entrance, Parking lot B"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                maxLength={200}
                className="mt-2"
              />
            )}

            {/* Block amenity calendar toggle */}
            {locationType === 'amenity' && selectedAmenityId && (
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                    Block amenity calendar
                  </p>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Prevents reservations during this event
                  </p>
                </div>
                <Switch
                  checked={blocksAmenity}
                  onCheckedChange={setBlocksAmenity}
                />
              </div>
            )}
          </div>

          {/* Start date/time */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Start
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          {/* End date/time */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              End
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Visibility
            </label>
            <Select
              value={visibility}
              onValueChange={(val) => setVisibility(val as EventVisibility)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Display & Notification Settings */}
          <div className="space-y-3 rounded-lg border border-stroke-light dark:border-stroke-dark p-3">
            <p className="text-label text-text-secondary-light dark:text-text-secondary-dark font-semibold">
              Display & Notifications
            </p>

            {/* Show on announcements */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                  Show in announcements
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Event appears in the announcements feed until its date passes
                </p>
              </div>
              <Switch
                checked={showOnAnnouncements}
                onCheckedChange={setShowOnAnnouncements}
              />
            </div>

            {/* Pin event */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                  Pin event
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Keeps this event at the top of announcements and events
                </p>
              </div>
              <Switch
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            </div>

            {/* Email notification on create */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                    {isEditing ? 'Send update email' : 'Send email notification'}
                  </p>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {isEditing
                      ? 'Notify selected members about this update'
                      : 'Notify selected members when this event is created'}
                  </p>
                </div>
                <Switch
                  checked={notifyOnCreate}
                  onCheckedChange={setNotifyOnCreate}
                />
              </div>

              {/* Role checkboxes */}
              {notifyOnCreate && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 pl-1 pt-1">
                  {NOTIFY_ROLE_OPTIONS.map(({ role, label }) => (
                    <div key={role} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`notify-${role}`}
                        checked={notifyRoles.includes(role)}
                        onCheckedChange={() => toggleNotifyRole(role)}
                      />
                      <Label
                        htmlFor={`notify-${role}`}
                        className="text-body text-text-secondary-light dark:text-text-secondary-dark cursor-pointer"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RSVP Settings */}
          <div className="space-y-3 rounded-lg border border-stroke-light dark:border-stroke-dark p-3">
            <p className="text-label text-text-secondary-light dark:text-text-secondary-dark font-semibold">
              RSVP Settings
            </p>

            {/* Enable RSVP */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                  Require RSVP
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Members must RSVP to attend this event
                </p>
              </div>
              <Switch
                checked={rsvpEnabled}
                onCheckedChange={setRsvpEnabled}
              />
            </div>

            {rsvpEnabled && (
              <div className="space-y-3 pt-1">
                {/* Fee */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    RSVP Fee
                    <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                      (leave empty for free)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-text-muted-light dark:text-text-muted-dark">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={rsvpFee}
                        onChange={(e) => setRsvpFee(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                    <Select
                      value={rsvpFeeType}
                      onValueChange={(v) => setRsvpFeeType(v as 'per_person' | 'flat')}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat fee</SelectItem>
                        <SelectItem value="per_person">Per person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Max capacity */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Max capacity
                    <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                      (optional)
                    </span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={rsvpMaxCapacity}
                    onChange={(e) => setRsvpMaxCapacity(e.target.value)}
                  />
                </div>

                {/* Cancellation policy */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                      Allow cancellation
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      Members can cancel their RSVP with auto-refund
                    </p>
                  </div>
                  <Switch
                    checked={rsvpAllowCancellation}
                    onCheckedChange={setRsvpAllowCancellation}
                  />
                </div>

                {rsvpAllowCancellation && (
                  <div className="space-y-1.5">
                    <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Minimum notice for refund
                      <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                        (hours before event, optional)
                      </span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Always refund"
                      value={rsvpCancellationNoticeHours}
                      onChange={(e) => setRsvpCancellationNoticeHours(e.target.value)}
                    />
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {rsvpCancellationNoticeHours
                        ? `Members can cancel anytime, but refunds are only given if cancelled ${rsvpCancellationNoticeHours}+ hours before the event.`
                        : 'Members will always receive a refund when they cancel.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || !isFormValid()}>
            {submitting
              ? isEditing
                ? 'Saving...'
                : 'Creating...'
              : isEditing
                ? 'Save Changes'
                : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
