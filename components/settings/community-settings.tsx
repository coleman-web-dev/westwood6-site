'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';

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
    }
  }, [community]);

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
      })
      .eq('id', community.id);

    setSaving(false);

    if (error) {
      toast.error('Could not save community settings. Please try again.');
      return;
    }

    toast.success('Community settings updated.');
  }

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
                Tenants can book shared spaces and amenities
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

      {/* Save button */}
      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
