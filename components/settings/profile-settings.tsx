'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import { useUnsavedChanges } from '@/lib/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/settings/unsaved-changes-dialog';

export function ProfileSettings() {
  const { member, actualIsBoard } = useCommunity();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [boardTitle, setBoardTitle] = useState('');
  const [showInDirectory, setShowInDirectory] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current values from member context
  useEffect(() => {
    if (member) {
      setFirstName(member.first_name);
      setLastName(member.last_name);
      setEmail(member.email ?? '');
      setPhone(member.phone ?? '');
      setBoardTitle(member.board_title ?? '');
      setShowInDirectory(member.show_in_directory);
    }
  }, [member]);

  const isDirty = useMemo(() => {
    if (!member) return false;
    return (
      firstName !== member.first_name ||
      lastName !== member.last_name ||
      email !== (member.email ?? '') ||
      phone !== (member.phone ?? '') ||
      boardTitle !== (member.board_title ?? '') ||
      showInDirectory !== member.show_in_directory
    );
  }, [firstName, lastName, email, phone, boardTitle, showInDirectory, member]);

  async function handleSave() {
    if (!member) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      toast.error('First and last name are required.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('members')
      .update({
        first_name: trimmedFirst,
        last_name: trimmedLast,
        email: email.trim() || null,
        phone: phone.trim() || null,
        board_title: boardTitle.trim() || null,
        show_in_directory: showInDirectory,
      })
      .eq('id', member.id);

    setSaving(false);

    if (error) {
      toast.error('Could not save your profile. Please try again.');
      return;
    }

    toast.success('Profile updated.');
  }

  const unsaved = useUnsavedChanges({ isDirty, onSave: handleSave });

  if (!member) return null;

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Your Profile
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="first-name"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              First name
            </Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="last-name"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Last name
            </Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="phone"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>

        {actualIsBoard && (
          <div className="space-y-1.5">
            <Label
              htmlFor="board-title"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Board Title
            </Label>
            <Input
              id="board-title"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              placeholder="e.g. President, Treasurer, Secretary"
              maxLength={50}
            />
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Shown on the public landing page if enabled.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-body text-text-primary-light dark:text-text-primary-dark">
              Show in member directory
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Other residents can see your name and contact info
            </p>
          </div>
          <Switch
            checked={showInDirectory}
            onCheckedChange={setShowInDirectory}
          />
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <UnsavedChangesDialog {...unsaved} />
    </div>
  );
}
