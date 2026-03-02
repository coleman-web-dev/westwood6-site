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
import { getAmenityIcon } from '@/lib/amenity-icons';
import { toast } from 'sonner';
import type { Amenity, Event, EventVisibility } from '@/lib/types/database';

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

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      location: isAmenityLocation
        ? selectedAmenityObj?.name ?? null
        : locationType === 'other'
          ? customLocation.trim() || null
          : null,
      start_datetime: startIso,
      end_datetime: endIso,
      visibility,
      amenity_id: isAmenityLocation ? selectedAmenityId : null,
      blocks_amenity: isAmenityLocation ? blocksAmenity : false,
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
    }

    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
