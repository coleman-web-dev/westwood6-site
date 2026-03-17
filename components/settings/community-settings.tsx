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
import { logAuditEvent } from '@/lib/audit';
import { useUnsavedChanges } from '@/lib/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/settings/unsaved-changes-dialog';
import { AmenityList } from '@/components/amenities/amenity-list';
import { VendorsManager } from '@/components/settings/vendors-manager';

import { StripeMigrationSection } from '@/components/settings/stripe-migration-section';
import { InsuranceReminderSettings } from '@/components/settings/insurance-reminder-settings';
import type { PaymentFrequency, BulletinSettings, LateFeeSettings, ConvenienceFeeSettings, VotingConfig, NoticeType } from '@/lib/types/database';
import { VOTING_CONFIG_DEFAULTS } from '@/lib/types/database';

export function CommunitySettings() {
  const { community, member } = useCommunity();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [canReserveAmenities, setCanReserveAmenities] = useState(false);
  const [canAttendEvents, setCanAttendEvents] = useState(false);
  const [canSubmitRequests, setCanSubmitRequests] = useState(false);
  const [canViewDirectory, setCanViewDirectory] = useState(false);
  const [canReportViolations, setCanReportViolations] = useState(false);
  const [allowFlexibleFrequency, setAllowFlexibleFrequency] = useState(false);
  const [defaultFrequency, setDefaultFrequency] = useState<PaymentFrequency>('quarterly');
  const [bulletinPosting, setBulletinPosting] = useState<BulletinSettings['posting']>('board_only');
  const [bulletinCommenting, setBulletinCommenting] = useState<BulletinSettings['commenting']>('all_households');
  const [lateFeesEnabled, setLateFeesEnabled] = useState(false);
  const [gracePeriodDays, setGracePeriodDays] = useState(15);
  const [feeType, setFeeType] = useState<'flat' | 'percent'>('flat');
  const [feeAmount, setFeeAmount] = useState(2500); // cents
  const [maxFee, setMaxFee] = useState<number | undefined>(undefined);
  const [convenienceFeeEnabled, setConvenienceFeeEnabled] = useState(false);
  const [convenienceFeePercent, setConvenienceFeePercent] = useState(3.5);
  const [convenienceFeeFixed, setConvenienceFeeFixed] = useState(30); // cents
  const [autoGenerateInvoices, setAutoGenerateInvoices] = useState(false);
  const [autoMarkOverdue, setAutoMarkOverdue] = useState(false);
  const [autoNotifyNewInvoices, setAutoNotifyNewInvoices] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(7);
  const [reminderDaysAfter, setReminderDaysAfter] = useState(7);
  const [arcEnabled, setArcEnabled] = useState(false);
  const [votingConfig, setVotingConfig] = useState<VotingConfig>(VOTING_CONFIG_DEFAULTS);
  const [autoEscalationEnabled, setAutoEscalationEnabled] = useState(false);
  const [defaultDeadlineDays, setDefaultDeadlineDays] = useState(14);
  const [escalationNoticeType, setEscalationNoticeType] = useState<NoticeType>('final_notice');
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
      setCanReportViolations(community.tenant_permissions?.can_report_violations ?? false);
      setAllowFlexibleFrequency(community.theme?.payment_settings?.allow_flexible_frequency ?? false);
      setDefaultFrequency(community.theme?.payment_settings?.default_frequency ?? 'quarterly');
      setBulletinPosting(community.theme?.bulletin_settings?.posting ?? 'board_only');
      setBulletinCommenting(community.theme?.bulletin_settings?.commenting ?? 'all_households');
      const lfs = community.theme?.payment_settings?.late_fee_settings as LateFeeSettings | undefined;
      setLateFeesEnabled(lfs?.enabled ?? false);
      setGracePeriodDays(lfs?.grace_period_days ?? 15);
      setFeeType(lfs?.fee_type ?? 'flat');
      setFeeAmount(lfs?.fee_amount ?? 2500);
      setMaxFee(lfs?.max_fee);
      const cfs = community.theme?.payment_settings?.convenience_fee_settings as ConvenienceFeeSettings | undefined;
      setConvenienceFeeEnabled(cfs?.enabled ?? false);
      setConvenienceFeePercent(cfs?.fee_percent ?? 3.5);
      setConvenienceFeeFixed(cfs?.fee_fixed ?? 30);
      setAutoGenerateInvoices(!!community.theme?.payment_settings?.auto_generate_invoices);
      setAutoMarkOverdue(!!community.theme?.payment_settings?.auto_mark_overdue);
      setAutoNotifyNewInvoices(!!community.theme?.payment_settings?.auto_notify_new_invoices);
      setReminderDaysBefore((community.theme?.payment_settings?.reminder_days_before as number) ?? 7);
      setReminderDaysAfter((community.theme?.payment_settings?.reminder_days_after as number) ?? 7);
      setArcEnabled(!!community.theme?.arc_enabled);
      const vc = community.theme?.voting_config as VotingConfig | undefined;
      setVotingConfig({ ...VOTING_CONFIG_DEFAULTS, ...vc });
      const vs = community.tenant_permissions?.violation_settings;
      setAutoEscalationEnabled(vs?.auto_escalation_enabled ?? false);
      setDefaultDeadlineDays(vs?.default_deadline_days ?? 14);
      setEscalationNoticeType(vs?.escalation_notice_type ?? 'final_notice');
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
      canReportViolations !== (community.tenant_permissions?.can_report_violations ?? false) ||
      allowFlexibleFrequency !== (community.theme?.payment_settings?.allow_flexible_frequency ?? false) ||
      defaultFrequency !== (community.theme?.payment_settings?.default_frequency ?? 'quarterly') ||
      bulletinPosting !== (community.theme?.bulletin_settings?.posting ?? 'board_only') ||
      bulletinCommenting !== (community.theme?.bulletin_settings?.commenting ?? 'all_households') ||
      lateFeesEnabled !== ((community.theme?.payment_settings?.late_fee_settings as LateFeeSettings | undefined)?.enabled ?? false) ||
      gracePeriodDays !== ((community.theme?.payment_settings?.late_fee_settings as LateFeeSettings | undefined)?.grace_period_days ?? 15) ||
      feeType !== ((community.theme?.payment_settings?.late_fee_settings as LateFeeSettings | undefined)?.fee_type ?? 'flat') ||
      feeAmount !== ((community.theme?.payment_settings?.late_fee_settings as LateFeeSettings | undefined)?.fee_amount ?? 2500) ||
      maxFee !== (community.theme?.payment_settings?.late_fee_settings as LateFeeSettings | undefined)?.max_fee ||
      convenienceFeeEnabled !== ((community.theme?.payment_settings?.convenience_fee_settings as ConvenienceFeeSettings | undefined)?.enabled ?? false) ||
      convenienceFeePercent !== ((community.theme?.payment_settings?.convenience_fee_settings as ConvenienceFeeSettings | undefined)?.fee_percent ?? 3.5) ||
      convenienceFeeFixed !== ((community.theme?.payment_settings?.convenience_fee_settings as ConvenienceFeeSettings | undefined)?.fee_fixed ?? 30) ||
      autoGenerateInvoices !== (!!community.theme?.payment_settings?.auto_generate_invoices) ||
      autoMarkOverdue !== (!!community.theme?.payment_settings?.auto_mark_overdue) ||
      autoNotifyNewInvoices !== (!!community.theme?.payment_settings?.auto_notify_new_invoices) ||
      reminderDaysBefore !== ((community.theme?.payment_settings?.reminder_days_before as number) ?? 7) ||
      reminderDaysAfter !== ((community.theme?.payment_settings?.reminder_days_after as number) ?? 7) ||
      arcEnabled !== (!!community.theme?.arc_enabled) ||
      JSON.stringify(votingConfig) !== JSON.stringify({ ...VOTING_CONFIG_DEFAULTS, ...(community.theme?.voting_config as VotingConfig | undefined) }) ||
      autoEscalationEnabled !== (community.tenant_permissions?.violation_settings?.auto_escalation_enabled ?? false) ||
      defaultDeadlineDays !== (community.tenant_permissions?.violation_settings?.default_deadline_days ?? 14) ||
      escalationNoticeType !== (community.tenant_permissions?.violation_settings?.escalation_notice_type ?? 'final_notice')
    );
  }, [
    name, address, phone, email,
    canReserveAmenities, canAttendEvents, canSubmitRequests, canViewDirectory, canReportViolations,
    allowFlexibleFrequency, defaultFrequency,
    bulletinPosting, bulletinCommenting,
    lateFeesEnabled, gracePeriodDays, feeType, feeAmount, maxFee,
    convenienceFeeEnabled, convenienceFeePercent, convenienceFeeFixed,
    autoGenerateInvoices, autoMarkOverdue, autoNotifyNewInvoices,
    reminderDaysBefore, reminderDaysAfter, arcEnabled, votingConfig,
    autoEscalationEnabled, defaultDeadlineDays, escalationNoticeType,
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
          can_report_violations: canReportViolations,
          violation_settings: {
            auto_escalation_enabled: autoEscalationEnabled,
            default_deadline_days: defaultDeadlineDays,
            escalation_notice_type: escalationNoticeType,
          },
        },
        theme: {
          ...community.theme,
          payment_settings: {
            allow_flexible_frequency: allowFlexibleFrequency,
            default_frequency: defaultFrequency,
            late_fee_settings: {
              enabled: lateFeesEnabled,
              grace_period_days: gracePeriodDays,
              fee_type: feeType,
              fee_amount: feeAmount,
              ...(maxFee ? { max_fee: maxFee } : {}),
            },
            convenience_fee_settings: {
              enabled: convenienceFeeEnabled,
              fee_percent: convenienceFeePercent,
              fee_fixed: convenienceFeeFixed,
            },
            auto_generate_invoices: autoGenerateInvoices,
            auto_mark_overdue: autoMarkOverdue,
            auto_notify_new_invoices: autoNotifyNewInvoices,
            reminder_days_before: reminderDaysBefore,
            reminder_days_after: reminderDaysAfter,
          },
          bulletin_settings: {
            posting: bulletinPosting,
            commenting: bulletinCommenting,
          },
          arc_enabled: arcEnabled,
          voting_config: votingConfig,
        },
      })
      .eq('id', community.id);

    setSaving(false);

    if (error) {
      toast.error('Could not save community settings. Please try again.');
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'settings_updated',
      targetType: 'community',
      targetId: community.id,
      metadata: { name: name.trim() },
    });
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

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Report violations
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Residents can submit violation reports for their unit
              </p>
            </div>
            <Switch
              checked={canReportViolations}
              onCheckedChange={setCanReportViolations}
            />
          </div>
        </div>
      </div>

      {/* Violation Settings */}
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Violation Settings
        </h2>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
          Configure auto-escalation for violations past their compliance deadline.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Auto-escalation
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Automatically escalate violations past their compliance deadline
              </p>
            </div>
            <Switch
              checked={autoEscalationEnabled}
              onCheckedChange={setAutoEscalationEnabled}
            />
          </div>

          <Collapsible open={autoEscalationEnabled}>
            <CollapsibleContent>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Default Deadline (days)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={defaultDeadlineDays}
                    onChange={(e) => setDefaultDeadlineDays(parseInt(e.target.value, 10) || 14)}
                    className="max-w-[120px]"
                  />
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Suggested deadline when creating violations
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Escalation Notice Type
                  </Label>
                  <Select value={escalationNoticeType} onValueChange={(v) => setEscalationNoticeType(v as NoticeType)}>
                    <SelectTrigger className="max-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="courtesy">Courtesy</SelectItem>
                      <SelectItem value="first_notice">First Notice</SelectItem>
                      <SelectItem value="second_notice">Second Notice</SelectItem>
                      <SelectItem value="final_notice">Final Notice</SelectItem>
                      <SelectItem value="hearing_notice">Hearing Notice</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Notice type sent when auto-escalating
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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

      {/* Stripe payment setup (direct mode) */}
      <StripeMigrationSection />

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

      {/* Vendors */}
      {community && (
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
          <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
            Vendors & Businesses
          </h2>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
            Manage recommended vendors and service providers. Control visibility per vendor:
            public (landing page + dashboard), community (dashboard only), or hidden (board only).
          </p>
          <VendorsManager
            communityId={community.id}
            communityName={community.name}
            communityTheme={community.theme}
          />

          <div className="mt-6 pt-4 border-t border-stroke-light dark:border-stroke-dark">
            <InsuranceReminderSettings
              communityId={community.id}
              communityTheme={community.theme}
            />
          </div>
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

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Auto-generate invoices */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Auto-generate invoices
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Automatically create invoices for upcoming billing periods (14 days ahead)
              </p>
            </div>
            <Switch
              checked={autoGenerateInvoices}
              onCheckedChange={setAutoGenerateInvoices}
            />
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Auto-notify new invoices */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Auto-notify new invoices
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Email homeowners when new invoices are generated
              </p>
            </div>
            <Switch
              checked={autoNotifyNewInvoices}
              onCheckedChange={setAutoNotifyNewInvoices}
            />
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Auto-mark overdue */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Auto-mark overdue
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Automatically change invoice status to overdue when past due date
              </p>
            </div>
            <Switch
              checked={autoMarkOverdue}
              onCheckedChange={setAutoMarkOverdue}
            />
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Reminder schedule */}
          <div className="space-y-1.5">
            <label className="text-body text-text-primary-light dark:text-text-primary-dark">
              Payment reminder schedule
            </label>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              When to send automated payment reminder emails
            </p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Days before due date
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={reminderDaysBefore}
                  onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Days after (overdue reminder)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={reminderDaysAfter}
                  onChange={(e) => setReminderDaysAfter(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Late fees */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Late fees
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Automatically apply late fees to overdue invoices
              </p>
            </div>
            <Switch
              checked={lateFeesEnabled}
              onCheckedChange={setLateFeesEnabled}
            />
          </div>

          <Collapsible open={lateFeesEnabled}>
            <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="border-t border-stroke-light dark:border-stroke-dark mt-4" />
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Grace period (days)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={90}
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Fee type
                    </Label>
                    <Select value={feeType} onValueChange={(v) => setFeeType(v as 'flat' | 'percent')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat fee</SelectItem>
                        <SelectItem value="percent">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      {feeType === 'flat' ? 'Fee amount ($)' : 'Fee percentage (%)'}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={feeType === 'flat' ? 0.01 : 1}
                      value={feeType === 'flat' ? (feeAmount / 100).toFixed(2) : feeAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFeeAmount(feeType === 'flat' ? Math.round(val * 100) : val);
                      }}
                    />
                  </div>
                  {feeType === 'percent' && (
                    <div className="space-y-1.5">
                      <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                        Max fee ($, optional)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={maxFee ? (maxFee / 100).toFixed(2) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMaxFee(val ? Math.round(Number(val) * 100) : undefined);
                        }}
                        placeholder="No max"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Processing fee */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Processing fee
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Add a processing fee to cover credit card charges
              </p>
            </div>
            <Switch
              checked={convenienceFeeEnabled}
              onCheckedChange={setConvenienceFeeEnabled}
            />
          </div>

          <Collapsible open={convenienceFeeEnabled}>
            <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="border-t border-stroke-light dark:border-stroke-dark mt-4" />
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Fee percentage (%)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={convenienceFeePercent}
                      onChange={(e) => setConvenienceFeePercent(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Fixed fee ($)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={(convenienceFeeFixed / 100).toFixed(2)}
                      onChange={(e) => setConvenienceFeeFixed(Math.round(Number(e.target.value) * 100))}
                    />
                  </div>
                </div>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Example: on a $250 invoice, the fee would be ${((250 * convenienceFeePercent / 100) + convenienceFeeFixed / 100).toFixed(2)}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Voting Rules */}
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Voting Rules
        </h2>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
          Configure voting defaults based on your state statutes and community bylaws.
          Florida HOA defaults are pre-filled.
        </p>

        <div className="space-y-4">
          {/* Quorum & Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Default quorum (%)
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={votingConfig.default_quorum_percent}
                onChange={(e) => setVotingConfig(prev => ({ ...prev, default_quorum_percent: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Amendment approval (%)
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={votingConfig.amendment_approval_threshold}
                onChange={(e) => setVotingConfig(prev => ({ ...prev, amendment_approval_threshold: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Special assessment approval (%)
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={votingConfig.special_assessment_threshold}
                onChange={(e) => setVotingConfig(prev => ({ ...prev, special_assessment_threshold: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Notice Periods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Election notice period (days)
              </Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={votingConfig.election_notice_days}
                onChange={(e) => setVotingConfig(prev => ({ ...prev, election_notice_days: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Meeting notice period (days)
              </Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={votingConfig.meeting_notice_days}
                onChange={(e) => setVotingConfig(prev => ({ ...prev, meeting_notice_days: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Proxy Voting */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Allow proxy voting
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Members can authorize another member to vote on their behalf
              </p>
            </div>
            <Switch
              checked={votingConfig.proxy_voting_allowed}
              onCheckedChange={(v) => setVotingConfig(prev => ({ ...prev, proxy_voting_allowed: v }))}
            />
          </div>

          <Collapsible open={votingConfig.proxy_voting_allowed}>
            <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="border-t border-stroke-light dark:border-stroke-dark mt-4" />
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                      Allow proxy for board elections
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      Florida statute prohibits proxy voting for board elections by default
                    </p>
                  </div>
                  <Switch
                    checked={votingConfig.proxy_voting_for_elections}
                    onCheckedChange={(v) => setVotingConfig(prev => ({ ...prev, proxy_voting_for_elections: v }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Proxy validity period (days)
                  </Label>
                  <div className="max-w-xs">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={votingConfig.proxy_validity_days}
                      onChange={(e) => setVotingConfig(prev => ({ ...prev, proxy_validity_days: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Secret Ballot */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Secret ballot for elections
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Florida requires secret ballots for contested board elections
              </p>
            </div>
            <Switch
              checked={votingConfig.secret_ballot_for_elections}
              onCheckedChange={(v) => setVotingConfig(prev => ({ ...prev, secret_ballot_for_elections: v }))}
            />
          </div>

          <div className="border-t border-stroke-light dark:border-stroke-dark" />

          {/* Electronic Voting */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Allow electronic voting
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Members can cast votes through the portal instead of in person
              </p>
            </div>
            <Switch
              checked={votingConfig.electronic_voting_allowed}
              onCheckedChange={(v) => setVotingConfig(prev => ({ ...prev, electronic_voting_allowed: v }))}
            />
          </div>
        </div>
      </div>

      {/* ARC Requests */}
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Architectural Review
        </h2>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
          Allow homeowners to submit architectural review requests for exterior modifications.
        </p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-body text-text-primary-light dark:text-text-primary-dark">
              Enable ARC requests
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Residents can submit requests for exterior modifications
            </p>
          </div>
          <Switch
            checked={arcEnabled}
            onCheckedChange={setArcEnabled}
          />
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
