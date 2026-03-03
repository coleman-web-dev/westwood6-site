'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { MemberRole, Unit } from '@/lib/types/database';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  unitOverride?: Unit;
}

export function AddMemberDialog({ open, onOpenChange, onSuccess, unitOverride }: AddMemberDialogProps) {
  const { community, member, unit: contextUnit } = useCommunity();
  const unit = unitOverride ?? contextUnit;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setRole('member');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      toast.error('First and last name are required.');
      return;
    }

    if (!unit || !member) {
      toast.error('Unable to add member. Unit information is missing.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('members').insert({
      community_id: community.id,
      unit_id: unit.id,
      first_name: trimmedFirst,
      last_name: trimmedLast,
      email: email.trim() || null,
      phone: phone.trim() || null,
      member_role: role,
      system_role: 'resident',
      parent_member_id: member.id,
      show_in_directory: true,
      is_approved: true,
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to add member. Please try again.');
      return;
    }

    toast.success(`${trimmedFirst} ${trimmedLast} has been added to your household.`);
    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Household Member</DialogTitle>
          <DialogDescription>
            Add a new member to your household. They will be associated with your unit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-first-name">First Name *</Label>
              <Input
                id="add-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-last-name">Last Name *</Label>
              <Input
                id="add-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-email">Email <span className="text-text-muted-light dark:text-text-muted-dark font-normal">(optional)</span></Label>
            <Input
              id="add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-phone">Phone <span className="text-text-muted-light dark:text-text-muted-dark font-normal">(optional)</span></Label>
            <Input
              id="add-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-role">Role</Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as MemberRole)}
              disabled={submitting}
            >
              <SelectTrigger id="add-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
