'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { ChevronLeft, ChevronRight, Plus, Trash2, GripVertical, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { useDialogUnsavedChanges } from '@/lib/hooks/use-dialog-unsaved-changes';
import { DialogUnsavedChangesAlert } from '@/components/shared/dialog-unsaved-changes-alert';
import { AlertCircle } from 'lucide-react';
import type { BallotType, BallotTallyMethod, Ballot, VotingConfig } from '@/lib/types/database';
import { VOTING_CONFIG_DEFAULTS } from '@/lib/types/database';

const BALLOT_TYPE_LABELS: Record<BallotType, string> = {
  board_election: 'Board of Directors Election',
  budget_approval: 'Budget / Assessment Approval',
  amendment: 'Governing Document Amendment',
  special_assessment: 'Special Assessment',
  recall: 'Board Member Recall',
  general: 'General Vote',
};

const TALLY_METHOD_LABELS: Record<BallotTallyMethod, string> = {
  plurality: 'Plurality (highest votes wins)',
  yes_no: 'Yes / No',
  yes_no_abstain: 'Yes / No / Abstain',
  multi_select: 'Multiple Selection',
};

interface CreateBallotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editBallot?: Ballot & { options?: { id: string; label: string; description: string | null; display_order: number }[] };
}

export function CreateBallotDialog({
  open,
  onOpenChange,
  onSuccess,
  editBallot,
}: CreateBallotDialogProps) {
  const { community, member } = useCommunity();
  const votingConfig: VotingConfig = { ...VOTING_CONFIG_DEFAULTS, ...(community?.theme?.voting_config as Partial<VotingConfig> | undefined) };
  const isEditing = !!editBallot;

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Basic info
  const [title, setTitle] = useState(editBallot?.title ?? '');
  const [description, setDescription] = useState(editBallot?.description ?? '');
  const [ballotType, setBallotType] = useState<BallotType>(editBallot?.ballot_type ?? 'general');
  const [tallyMethod, setTallyMethod] = useState<BallotTallyMethod>(editBallot?.tally_method ?? 'yes_no');

  // Step 2: Options
  const [options, setOptions] = useState<{ key: string; label: string; description: string }[]>(
    editBallot?.options?.map((o) => ({
      key: o.id,
      label: o.label,
      description: o.description ?? '',
    })) ?? [
      { key: crypto.randomUUID(), label: '', description: '' },
      { key: crypto.randomUUID(), label: '', description: '' },
    ],
  );

  // Step 3: Schedule & rules
  const [opensAt, setOpensAt] = useState(editBallot?.opens_at ? editBallot.opens_at.slice(0, 16) : '');
  const [closesAt, setClosesAt] = useState(editBallot?.closes_at ? editBallot.closes_at.slice(0, 16) : '');
  const [quorumThreshold, setQuorumThreshold] = useState(
    editBallot ? String(Math.round(editBallot.quorum_threshold * 100)) : String(votingConfig.default_quorum_percent),
  );
  const [approvalThreshold, setApprovalThreshold] = useState(
    editBallot?.approval_threshold ? String(Math.round(editBallot.approval_threshold * 100)) : '',
  );
  const [isSecretBallot, setIsSecretBallot] = useState(editBallot?.is_secret_ballot ?? false);
  const [maxSelections, setMaxSelections] = useState(String(editBallot?.max_selections ?? 1));

  // Board elections must be secret ballot when config requires it
  const secretBallotLocked = ballotType === 'board_election' && votingConfig.secret_ballot_for_elections;

  const {
    touch,
    handleOpenChange,
    confirmCloseOpen,
    handleConfirmClose,
    setConfirmCloseOpen,
    resetTouched,
    dialogContentGuardProps,
  } = useDialogUnsavedChanges({ onOpenChange, onDiscard: resetForm });

  // When ballot type changes, auto-set related fields from voting config
  function handleBallotTypeChange(type: BallotType) {
    touch();
    setBallotType(type);
    if (type === 'board_election') {
      setIsSecretBallot(votingConfig.secret_ballot_for_elections);
      setTallyMethod('plurality');
    } else if (type === 'amendment') {
      setTallyMethod('yes_no');
      setApprovalThreshold(String(votingConfig.amendment_approval_threshold));
    } else if (type === 'special_assessment') {
      setTallyMethod('yes_no');
      setApprovalThreshold(String(votingConfig.special_assessment_threshold));
    } else if (type === 'budget_approval') {
      setTallyMethod('yes_no');
    }
  }

  // When tally method is yes_no or yes_no_abstain, auto-populate options
  function getDefaultOptionsForTally(method: BallotTallyMethod) {
    if (method === 'yes_no') {
      return [
        { key: crypto.randomUUID(), label: 'Yes', description: '' },
        { key: crypto.randomUUID(), label: 'No', description: '' },
      ];
    }
    if (method === 'yes_no_abstain') {
      return [
        { key: crypto.randomUUID(), label: 'Yes', description: '' },
        { key: crypto.randomUUID(), label: 'No', description: '' },
        { key: crypto.randomUUID(), label: 'Abstain', description: '' },
      ];
    }
    return options;
  }

  function handleTallyMethodChange(method: BallotTallyMethod) {
    touch();
    setTallyMethod(method);
    if (method === 'yes_no' || method === 'yes_no_abstain') {
      setOptions(getDefaultOptionsForTally(method));
      setMaxSelections('1');
    }
  }

  function addOption() {
    setOptions([...options, { key: crypto.randomUUID(), label: '', description: '' }]);
  }

  function removeOption(key: string) {
    if (options.length <= 2) {
      toast.error('A ballot must have at least 2 options.');
      return;
    }
    setOptions(options.filter((o) => o.key !== key));
  }

  function updateOption(key: string, field: 'label' | 'description', value: string) {
    setOptions(options.map((o) => (o.key === key ? { ...o, [field]: value } : o)));
  }

  // Validation per step
  function validateStep1(): boolean {
    if (!title.trim()) {
      toast.error('Please enter a ballot title.');
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    const validOptions = options.filter((o) => o.label.trim());
    if (validOptions.length < 2) {
      toast.error('Please provide at least 2 options.');
      return false;
    }
    return true;
  }

  function validateStep3(): boolean {
    if (!opensAt || !closesAt) {
      toast.error('Please set both opening and closing dates.');
      return false;
    }
    if (new Date(closesAt) <= new Date(opensAt)) {
      toast.error('Closing date must be after opening date.');
      return false;
    }
    const qThreshold = parseInt(quorumThreshold, 10);
    if (isNaN(qThreshold) || qThreshold < 1 || qThreshold > 100) {
      toast.error('Quorum threshold must be between 1% and 100%.');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validateStep3()) return;
    if (!member) return;

    setSubmitting(true);
    const supabase = createClient();
    const validOptions = options.filter((o) => o.label.trim());
    const qThreshold = parseInt(quorumThreshold, 10) / 100;
    const aThreshold = approvalThreshold ? parseInt(approvalThreshold, 10) / 100 : null;

    if (isEditing && editBallot) {
      // Update ballot
      const { error } = await supabase
        .from('ballots')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          ballot_type: ballotType,
          tally_method: tallyMethod,
          is_secret_ballot: secretBallotLocked || isSecretBallot,
          quorum_threshold: qThreshold,
          approval_threshold: aThreshold,
          max_selections: parseInt(maxSelections, 10) || 1,
          opens_at: new Date(opensAt).toISOString(),
          closes_at: new Date(closesAt).toISOString(),
        })
        .eq('id', editBallot.id);

      if (error) {
        toast.error('Failed to update ballot.');
        setSubmitting(false);
        return;
      }

      // Insert new options first, then delete old ones (prevents orphaning if insert fails)
      const optionRows = validOptions.map((o, i) => ({
        ballot_id: editBallot.id,
        label: o.label.trim(),
        description: o.description.trim() || null,
        display_order: i,
      }));
      const { error: optInsertError } = await supabase.from('ballot_options').insert(optionRows);

      if (optInsertError) {
        toast.error('Ballot updated but options failed to save. Please try editing again.');
        setSubmitting(false);
        return;
      }

      // Now safe to delete old options (new ones are already saved)
      const oldOptionIds = editBallot.options?.map((o) => o.id) ?? [];
      if (oldOptionIds.length > 0) {
        await supabase.from('ballot_options').delete().in('id', oldOptionIds);
      }

      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'ballot_updated',
        targetType: 'ballot',
        targetId: editBallot.id,
        metadata: { title: title.trim() },
      });
      toast.success('Ballot updated.');
    } else {
      // Create ballot
      const { data: ballotData, error } = await supabase
        .from('ballots')
        .insert({
          community_id: community.id,
          title: title.trim(),
          description: description.trim() || null,
          ballot_type: ballotType,
          tally_method: tallyMethod,
          is_secret_ballot: secretBallotLocked || isSecretBallot,
          quorum_threshold: qThreshold,
          approval_threshold: aThreshold,
          max_selections: parseInt(maxSelections, 10) || 1,
          opens_at: new Date(opensAt).toISOString(),
          closes_at: new Date(closesAt).toISOString(),
          created_by: member.id,
          status: 'draft',
        })
        .select('id')
        .single();

      if (error || !ballotData) {
        toast.error('Failed to create ballot.');
        setSubmitting(false);
        return;
      }

      // Insert options
      const optionRows = validOptions.map((o, i) => ({
        ballot_id: ballotData.id,
        label: o.label.trim(),
        description: o.description.trim() || null,
        display_order: i,
      }));
      const { error: optError } = await supabase.from('ballot_options').insert(optionRows);
      if (optError) {
        toast.error('Ballot created but options failed to save.');
      }

      // Notify board
      await supabase.rpc('create_board_notifications', {
        p_community_id: community.id,
        p_type: 'ballot_created',
        p_title: `New ballot: ${title.trim()}`,
        p_body: description.trim() || null,
        p_reference_id: ballotData.id,
        p_reference_type: 'ballot',
      });

      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'ballot_created',
        targetType: 'ballot',
        targetId: ballotData.id,
        metadata: { title: title.trim(), ballot_type: ballotType },
      });
      toast.success('Ballot created as draft.');
    }

    setSubmitting(false);
    resetTouched();
    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  function resetForm() {
    setStep(1);
    setTitle('');
    setDescription('');
    setBallotType('general');
    setTallyMethod('yes_no');
    setOptions([
      { key: crypto.randomUUID(), label: '', description: '' },
      { key: crypto.randomUUID(), label: '', description: '' },
    ]);
    setOpensAt('');
    setClosesAt('');
    setQuorumThreshold(String(votingConfig.default_quorum_percent));
    setApprovalThreshold('');
    setIsSecretBallot(false);
    setMaxSelections('1');
  }

  const isYesNo = tallyMethod === 'yes_no' || tallyMethod === 'yes_no_abstain';

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" {...dialogContentGuardProps}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Ballot' : 'Create Ballot'} {step > 1 && `(Step ${step} of 3)`}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Define the ballot type and basic information.'}
            {step === 2 && 'Add the options voters will choose from.'}
            {step === 3 && 'Set the voting schedule and rules.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div className="space-y-4 py-2" onChangeCapture={touch}>
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 2026 Board of Directors Election"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context or details about this vote..."
                rows={3}
                className="resize-none"
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Ballot Type
              </label>
              <Select value={ballotType} onValueChange={(v) => handleBallotTypeChange(v as BallotType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(BALLOT_TYPE_LABELS) as [BallotType, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Voting Method
              </label>
              <Select value={tallyMethod} onValueChange={(v) => handleTallyMethodChange(v as BallotTallyMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TALLY_METHOD_LABELS) as [BallotTallyMethod, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tallyMethod === 'multi_select' && (
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Maximum Selections
                </label>
                <Input
                  type="number"
                  value={maxSelections}
                  onChange={(e) => setMaxSelections(e.target.value)}
                  min={1}
                  max={20}
                />
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  How many options can each voter select?
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Options ── */}
        {step === 2 && (
          <div className="space-y-4 py-2" onChangeCapture={touch}>
            {isYesNo && (
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Options are preset for {tallyMethod === 'yes_no' ? 'Yes/No' : 'Yes/No/Abstain'} voting.
              </p>
            )}

            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div
                  key={opt.key}
                  className="flex items-start gap-2 rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3"
                >
                  <GripVertical className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(opt.key, 'label', e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      disabled={isYesNo}
                      maxLength={200}
                    />
                    {!isYesNo && (
                      <Input
                        value={opt.description}
                        onChange={(e) => updateOption(opt.key, 'description', e.target.value)}
                        placeholder="Optional description"
                        className="text-meta"
                        maxLength={500}
                      />
                    )}
                  </div>
                  {!isYesNo && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(opt.key)}
                      className="shrink-0 text-text-muted-light dark:text-text-muted-dark hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {!isYesNo && (
              <Button variant="outline" onClick={addOption} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            )}
          </div>
        )}

        {/* ── Step 3: Schedule & Rules ── */}
        {step === 3 && (
          <div className="space-y-4 py-2" onChangeCapture={touch}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Opens <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Closes <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </div>
            </div>

            {/* Notice period warning */}
            {opensAt && (ballotType === 'board_election' || ballotType === 'recall') && (() => {
              const noticeDays = votingConfig.election_notice_days;
              const daysUntilOpen = Math.ceil((new Date(opensAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (daysUntilOpen < noticeDays) {
                return (
                  <div className="flex gap-2 rounded-inner-card border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-meta text-amber-700 dark:text-amber-300">
                      Your community requires {noticeDays} days notice for elections. This ballot opens in {daysUntilOpen} day{daysUntilOpen !== 1 ? 's' : ''}, which may not meet the notice requirement.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Quorum Threshold (%)
                </label>
                <Input
                  type="number"
                  value={quorumThreshold}
                  onChange={(e) => setQuorumThreshold(e.target.value)}
                  min={1}
                  max={100}
                />
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Minimum participation % for valid results
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Approval Threshold (%)
                </label>
                <Input
                  type="number"
                  value={approvalThreshold}
                  onChange={(e) => setApprovalThreshold(e.target.value)}
                  min={1}
                  max={100}
                  placeholder="Simple majority"
                />
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Leave blank for simple majority
                </p>
              </div>
            </div>

            {/* Secret Ballot Toggle */}
            <div className={`flex items-center gap-3 rounded-inner-card border-2 p-3 transition-colors ${
              isSecretBallot || secretBallotLocked
                ? 'border-secondary-500 bg-secondary-50/50 dark:bg-secondary-950/20'
                : 'border-stroke-light dark:border-stroke-dark'
            }`}>
              <input
                type="checkbox"
                checked={isSecretBallot || secretBallotLocked}
                onChange={(e) => !secretBallotLocked && setIsSecretBallot(e.target.checked)}
                disabled={secretBallotLocked}
                className="h-5 w-5 rounded border-2 border-primary-300 dark:border-primary-500 text-secondary-500 focus:ring-secondary-500 focus:ring-2 shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                    Secret Ballot
                  </span>
                  {secretBallotLocked && (
                    <span className="inline-flex items-center gap-1 text-meta text-secondary-500">
                      <Lock className="h-3 w-3" />
                      Required for elections
                    </span>
                  )}
                </div>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
                  Voter identity is separated from ballot choices. No one, including administrators, can see how individual members voted.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
              >
                Next: Options
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
              >
                Next: Schedule
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : isEditing ? 'Update Ballot' : 'Create Ballot'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DialogUnsavedChangesAlert
      open={confirmCloseOpen}
      onOpenChange={setConfirmCloseOpen}
      onDiscard={handleConfirmClose}
    />
    </>
  );
}
