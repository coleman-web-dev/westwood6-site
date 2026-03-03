'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
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
import { Collapsible, CollapsibleContent } from '@/components/shared/ui/collapsible';
import { toast } from 'sonner';
import { useUnsavedChanges } from '@/lib/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/settings/unsaved-changes-dialog';
import { AmenityList } from '@/components/amenities/amenity-list';
import { EmailSettingsSection } from '@/components/settings/email-settings-section';
import { StripeConnectSection } from '@/components/settings/stripe-connect-section';
import type { PaymentFrequency, BulletinSettings } from '@/lib/types/database';

export function CommunitySettings() {
  const { community } = useCommunity();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [canReserveAmenities, setCanReserveAmenities] = useState(false);
  const [canAttendEvents, setCanAttendEvents] = useState(false);
  const [canSubmitRequests, setCanSubmitRequests] = useState(false);
  const [canViewDirectory, setCanViewDirectory] = useState(false);
  const [allowFlexibleFrequency, setAllowFlexibleFrequency] = useState(false);
  const [defaultFrequency, setDefaultFrequency] = useState<PaymentFrequency>('quarterly');
  const [bulletinPosting, setBulletinPosting] = useState<BulletinSettings['posting']>('board_only');
  const [bulletinCommenting, setBulletinCommenting] = useState<BulletinSettings['commenting']>('all_households');
  const [saving, setSaving] = useState(false);

  // Load current values from community context
  useEffect(() => {
    if (community) {
      setName(community.name);
      setAddress(community.address ?? '');
      setPhone(community.phone ?? '');
      setEmail(community.email ?? '');
      setCanReserveAmenities(community.tenant_permissions?.can_reserve_amenities ?? false);
      setCanAttendEvents(community.tenant_permissions?.can_attend_events ?? false);
      setCanSubmitRequests(community.tenant_permissions?.can_submit_requests ?? false);
      setCanViewDirectory(community.tenant_permissions?.can_view_directory ?? false);
      setAllowFlexibleFrequency(community.theme?.payment_settings?.allow_flexible_frequency ?? false);
      setDefaultFrequency(community.theme?.payment_settings?.default_frequency ?? 'quarterly');
      setBulletinPosting(community.theme?.bulletin_settings?.posting ?? 'board_only');
      setBulletinCommenting(community.theme?.bulletin_settings?.commenting ?? 'all_households');
    }
  }, [community]);

  const isDirty = useMemo(() => {
    if (!community) return false;
    return (
      name !== community.name ||
      address !== (community.address ?? '') ||
      phone !== (community.phone ?? '') ||
      email !== (community.email ?? '') ||
      canReserveAmenities !== (community.tenant_permissions?.can_reserve_amenities ?? false) ||
      canAttendEvents !== (community.tenant_permissions?.can_attend_events ?? false) ||
      canSubmitRequests !== (community.tenant_permissions?.can_submit_requests ?? false) ||
      canViewDirectory !== (community.tenant_permissions?.can_view_directory ?? false) ||
      allowFlexibleFrequency !== (community.theme?.payment_settings?.allow_flexible_frequency ?? false) ||
      defaultFrequency !== (community.theme?.payment_settings?.default_frequency ?? 'quarterly') ||
      bulletinPosting !== (community.theme?.bulletin_settings?.posting ?? 'board_only') ||
      bulletinCommenting !== (community.theme?.bulletin_settings?.commenting ?? 'all_households')
    );
  }, [
    name, address, phone, email,
    canReserveAmenities, canAttendEvents, canSubmitRequests, canViewDirectory,
    allowFlexibleFrequency, defaultFrequency,
    bulletinPosting, bulletinCommenting,
    community,
  ]);

  async function handleSave() {
    if (!community) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error('Community name is required.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('communities')
      .update({
        name: trimmedName,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        tenant_permissions: {
          can_reserve_amenities: canReserveAmenities,
          can_attend_events: canAttendEvents,
          can_submit_requests: canSubmitRequests,
          can_view_directory: canViewDirectory,
        },
        theme: {
          ...community.theme,
          payment_settings: {
            allow_flexible_frequency: allowFlexibleFrequency,
            default_frequency: defaultFrequency,
          },
          bulletin_settings: {
            posting: bulletinPosting,
            commenting: bulletinCommenting,
          },
        },
      })
      .eq('id', community.id);

    setSaving(false);

    if (error) {
      toast.error('Could not save community settings. Please try again.');
      return;
    }

    toast.success('Community settings updated.');
  }

  const unsaved = useUnsavedChanges({ isDirty, onSave: handleSave });

  return (
    <div className="space-y-6">
      {/* Community info */}
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-4">
          Community Info
        </h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="community-name"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Community name
            </Label>
            <Input
              id="community-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Community name"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="community-address"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Address
            </Label>
            <Input
              id="community-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="community-phone"
                className="text-label text-text-secondary-light dark:text-text-secondary-dark"
              >
                Phone
              </Label>
              <Input
                id="community-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="community-email"
                className="text-label text-text-secondary-light dark:text-text-secondary-dark"
              >
                Email
              </Label>
              <Input
                id="community-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="board@example.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tenant permissions */}
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Tenant Permissions
        </h2>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
          Control what tenants (non-owners) can do within the portal.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Reserve amenities
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Tenants can book reservable amenities
              </p>
            </div>
            <Switch
              checked={canReserveAmenities}
              onCheckedChange={setCanReserveAmenities}
            />
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Attend events
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Tenants can view and RSVP to community events
              </p>
            </div>
            <Switch
              checked={canAttendEvents}
              onCheckedChange={setCanAttendEvents}
            />
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Submit maintenance requests
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Tenants can report issues and track repairs
              </p>
            </div>
            <Switch
              checked={canSubmitRequests}
              onCheckedChange={setCanSubmitRequests}
            />
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                View member directory
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Tenants can see other residents in the directory
              </p>
            </div>
            <Switch
              checked={canViewDirectory}
              onCheckedChange={setCanViewDirectory}
            />
          </div>
        </div>
      </div>

      {/* Bulletin Board */}
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Bulletin Board
        </h2>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
          Control who can post and comment on the community bulletin board.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-body text-text-primary-light dark:text-text-primary-dark">
              Who can create posts
            </label>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Board members can always post. This controls whether all households can too.
            </p>
            <div className="max-w-xs mt-2">
              <Select value={bulletinPosting} onValueChange={(v) => setBulletinPosting(v as BulletinSettings['posting'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board_only">Board members only</SelectItem>
                  <SelectItem value="all_households">All households</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          <div className="space-y-1.5">
            <label className="text-body text-text-primary-light dark:text-text-primary-dark">
              Who can comment on posts
            </label>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Board members can always comment. This controls whether all households can too.
            </p>
            <div className="max-w-xs mt-2">
              <Select value={bulletinCommenting} onValueChange={(v) => setBulletinCommenting(v as BulletinSettings['commenting'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board_only">Board members only</SelectItem>
                  <SelectItem value="all_households">All households</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Connect (online payments) */}
      <StripeConnectSection />

      {/* Email notifications (board config) */}
      <EmailSettingsSection />

      {/* Amenities */}
      {community && (
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
          <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
            Amenities
          </h2>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
            Manage your community&apos;s amenities. These appear in your community directory
            and, when reservable, in the member booking system.
          </p>
          <AmenityList communityId={community.id} />
        </div>
      )}

      {/* Payment settings */}
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Payment Settings
        </h2>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
          Configure how recurring assessments and payment schedules work.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Allow flexible payment frequency
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Households can choose to pay monthly, quarterly, semi-annually, or annually
              </p>
            </div>
            <Switch
              checked={allowFlexibleFrequency}
              onCheckedChange={setAllowFlexibleFrequency}
            />
          </div>

          <Collapsible open={allowFlexibleFrequency}>
            <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="border-t border-stroke-light dark:border-stroke-dark mt-4" />

              <div className="space-y-1.5 pt-4">
                <label className="text-body text-text-primary-light dark:text-text-primary-dark">
                  Default payment frequency
                </label>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Used when generating invoices for units that have not chosen a preference
                </p>
                <div className="max-w-xs mt-2">
                  <Select value={defaultFrequency} onValueChange={(v) => setDefaultFrequency(v as PaymentFrequency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Save button */}
      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <UnsavedChangesDialog {...unsaved} />
    </div>
  );
}
