'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { promoteToBoard } from '@/lib/actions/auth-actions';
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
import { TemplatePermissionTooltip } from '@/components/shared/template-permission-tooltip';
import { CustomPermissionsDialog } from '@/components/household/custom-permissions-dialog';
import { DEFAULT_ROLE_TEMPLATES } from '@/lib/types/permissions';
import type { RoleTemplate } from '@/lib/types/permissions';
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
  const { isBoard, community, member: currentUser } = useCommunity();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('member');
  const [boardTitle, setBoardTitle] = useState('');
  const [isBoardMember, setIsBoardMember] = useState(false);
  const [roleTemplateId, setRoleTemplateId] = useState<string>('');
  const [showInDirectory, setShowInDirectory] = useState(true);
  const [useUnitAddress, setUseUnitAddress] = useState(true);
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCustomPerms, setShowCustomPerms] = useState(false);

  // Get role templates from community theme
  const templates: RoleTemplate[] = (community.theme?.role_templates ?? DEFAULT_ROLE_TEMPLATES) as RoleTemplate[];

  const isSuperAdmin = member.system_role === 'super_admin';
  const isEditingSelf = currentUser?.user_id === member.user_id;
  const canManageBoardRole = isBoard && !isSuperAdmin;

  useEffect(() => {
    if (open) {
      setFirstName(member.first_name);
      setLastName(member.last_name);
      setEmail(member.email ?? '');
      setPhone(member.phone ?? '');
      setMemberRole(member.member_role);
      setBoardTitle(member.board_title ?? '');
      setIsBoardMember(['board', 'manager', 'super_admin'].includes(member.system_role));
      setRoleTemplateId(member.role_template_id ?? '');
      setShowInDirectory(member.show_in_directory);
      setUseUnitAddress(member.use_unit_address ?? true);
      setLine1(member.mailing_address_line1 ?? '');
      setLine2(member.mailing_address_line2 ?? '');
      setCity(member.mailing_city ?? '');
      setState(member.mailing_state ?? '');
      setZip(member.mailing_zip ?? '');
    }
  }, [open, member]);

  const originalIsBoardMember = ['board', 'manager', 'super_admin'].includes(member.system_role);
  const boardStatusChanged = isBoardMember !== originalIsBoardMember;
  const boardFieldsChanged = isBoardMember && (
    (boardTitle.trim() || '') !== (member.board_title || '') ||
    (roleTemplateId || '') !== (member.role_template_id || '')
  );

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Handle board promotion/demotion via server action
    if (canManageBoardRole && (boardStatusChanged || boardFieldsChanged)) {
      const newRole = isBoardMember ? 'board' : 'resident';
      const result = await promoteToBoard(
        member.id,
        newRole,
        isBoardMember ? boardTitle.trim() || null : null,
        isBoardMember ? roleTemplateId || null : null,
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to update board role.');
        setSaving(false);
        return;
      }
    }

    // Update other member fields
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
      // Only update board_title here if we didn't already handle it via promoteToBoard
      if (!canManageBoardRole || (!boardStatusChanged && !boardFieldsChanged)) {
        if (isBoardMember) {
          updates.board_title = boardTitle.trim() || null;
        }
      }
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

  function handleTemplateChange(value: string) {
    if (value === '__custom__') {
      setShowCustomPerms(true);
    } else if (value === '__none__') {
      setRoleTemplateId('');
    } else {
      setRoleTemplateId(value);
    }
  }

  function handleCustomPermsSaved(templateId: string) {
    setRoleTemplateId(templateId);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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
                  Household role
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

            {/* Board Position Section */}
            {canManageBoardRole && (
              <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                      Board member
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {isBoardMember ? 'Has admin access to community features' : 'Promote to a board position'}
                    </p>
                  </div>
                  <Switch
                    checked={isBoardMember}
                    onCheckedChange={(v) => {
                      if (!v && isEditingSelf) {
                        toast.error('You cannot demote yourself.');
                        return;
                      }
                      setIsBoardMember(v);
                      if (!v) {
                        setBoardTitle('');
                        setRoleTemplateId('');
                      }
                    }}
                    disabled={isSuperAdmin}
                  />
                </div>

                {isBoardMember && (
                  <>
                    {/* Board title */}
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
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Shown in the admin/personal toggle and member directory
                      </p>
                    </div>

                    {/* Permission template */}
                    <div className="space-y-1.5">
                      <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                        Permission template
                      </Label>
                      <Select
                        value={roleTemplateId || '__none__'}
                        onValueChange={handleTemplateChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No template (read-only)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No template (read-only)</SelectItem>
                          {templates.map((t) => (
                            <TemplatePermissionTooltip key={t.id} template={t} side="left">
                              <div>
                                <SelectItem value={t.id}>{t.name}</SelectItem>
                              </div>
                            </TemplatePermissionTooltip>
                          ))}
                          <SelectItem value="__custom__">Custom permissions...</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Hover over a template to preview its permissions
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Board title for existing board members (when not manageable, e.g. viewing own profile) */}
            {isBoard && !canManageBoardRole && isSuperAdmin && (
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

      {/* Custom permissions dialog */}
      <CustomPermissionsDialog
        open={showCustomPerms}
        onOpenChange={setShowCustomPerms}
        onSave={handleCustomPermsSaved}
      />
    </>
  );
}
