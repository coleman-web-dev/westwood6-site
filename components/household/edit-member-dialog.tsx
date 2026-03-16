'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { Member, MemberRole } from '@/lib/types/database';

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  onSaved: () => void;
}

export function EditMemberDialog({
  open,
  onOpenChange,
  member,
  onSaved,
}: EditMemberDialogProps) {
  const { isBoard } = useCommunity();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('member');
  const [boardTitle, setBoardTitle] = useState('');
  const [showInDirectory, setShowInDirectory] = useState(true);
  const [useUnitAddress, setUseUnitAddress] = useState(true);
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(member.first_name);
      setLastName(member.last_name);
      setEmail(member.email ?? '');
      setPhone(member.phone ?? '');
      setMemberRole(member.member_role);
      setBoardTitle(member.board_title ?? '');
      setShowInDirectory(member.show_in_directory);
      setUseUnitAddress(member.use_unit_address ?? true);
      setLine1(member.mailing_address_line1 ?? '');
      setLine2(member.mailing_address_line2 ?? '');
      setCity(member.mailing_city ?? '');
      setState(member.mailing_state ?? '');
      setZip(member.mailing_zip ?? '');
    }
  }, [open, member]);

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      show_in_directory: showInDirectory,
      use_unit_address: useUnitAddress,
      mailing_address_line1: useUnitAddress ? null : line1.trim() || null,
      mailing_address_line2: useUnitAddress ? null : line2.trim() || null,
      mailing_city: useUnitAddress ? null : city.trim() || null,
      mailing_state: useUnitAddress ? null : state.trim() || null,
      mailing_zip: useUnitAddress ? null : zip.trim() || null,
    };

    if (isBoard) {
      updates.member_role = memberRole;
      updates.board_title = boardTitle.trim() || null;
    }

    const { error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', member.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update member.');
      return;
    }

    toast.success('Member updated.');
    onSaved();
    onOpenChange(false);
  }

  const isBoardSystemRole = ['board', 'manager', 'super_admin'].includes(member.system_role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update info for {member.first_name} {member.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-first" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                First name
              </Label>
              <Input
                id="edit-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-last" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Last name
              </Label>
              <Input
                id="edit-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-email" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Email
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Phone
            </Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>

          {/* Role (board only) */}
          {isBoard && (
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Role
              </Label>
              <Select value={memberRole} onValueChange={(v) => setMemberRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Board title (only for board-level system roles) */}
          {isBoard && isBoardSystemRole && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-board-title" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Board title
              </Label>
              <Input
                id="edit-board-title"
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                placeholder="e.g. President, Treasurer"
                maxLength={50}
              />
            </div>
          )}

          {/* Directory visibility */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Show in directory
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Visible to other community members
              </p>
            </div>
            <Switch
              checked={showInDirectory}
              onCheckedChange={setShowInDirectory}
            />
          </div>

          {/* Mailing address */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Use unit address
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Mail goes to the property address
              </p>
            </div>
            <Switch
              checked={useUnitAddress}
              onCheckedChange={setUseUnitAddress}
            />
          </div>

          {!useUnitAddress && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-addr-line1" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Street address
                </Label>
                <Input
                  id="edit-addr-line1"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-addr-line2" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Address line 2
                </Label>
                <Input
                  id="edit-addr-line2"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Apt, suite, unit (optional)"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="edit-addr-city" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    City
                  </Label>
                  <Input
                    id="edit-addr-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-addr-state" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    State
                  </Label>
                  <Input
                    id="edit-addr-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="FL"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-addr-zip" className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    ZIP
                  </Label>
                  <Input
                    id="edit-addr-zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
