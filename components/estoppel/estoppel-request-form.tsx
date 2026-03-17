'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { partitionEstoppelFieldsByPhase } from '@/lib/utils/estoppel-template';
import type { EstoppelSettings, EstoppelField } from '@/lib/types/database';

interface EstoppelRequestFormProps {
  communityId: string;
  communityName: string;
  communitySlug: string;
  estoppelSettings: EstoppelSettings;
  unitNumbers: string[];
}

export function EstoppelRequestForm({
  communityId,
  communityName,
  communitySlug,
  estoppelSettings,
  unitNumbers,
}: EstoppelRequestFormProps) {
  const { requesterFields: requesterFieldDefs } = partitionEstoppelFieldsByPhase(
    estoppelSettings.fields,
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [requestType, setRequestType] = useState<'standard' | 'expedited'>('standard');
  const [submitting, setSubmitting] = useState(false);

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function renderField(field: EstoppelField) {
    const value = answers[field.key] ?? '';

    // Special handling for lot_number: show suggestions from unit list
    if (field.key === 'lot_number' && unitNumbers.length > 0) {
      return (
        <div key={field.id} className="space-y-1">
          <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <Input
            list="unit-numbers"
            value={value}
            onChange={(e) => updateAnswer(field.key, e.target.value)}
            placeholder={field.placeholder || 'Enter lot/unit number'}
          />
          <datalist id="unit-numbers">
            {unitNumbers.map((num) => (
              <option key={num} value={num} />
            ))}
          </datalist>
        </div>
      );
    }

    switch (field.type) {
      case 'yes_no':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <div className="flex items-center gap-3">
              <Switch
                checked={value === 'Yes'}
                onCheckedChange={(checked) => updateAnswer(field.key, checked ? 'Yes' : 'No')}
              />
              <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                {value || 'No'}
              </span>
            </div>
          </div>
        );
      case 'date':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => updateAnswer(field.key, e.target.value)}
              className="max-w-xs"
            />
          </div>
        );
      case 'number':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => updateAnswer(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="max-w-xs"
            />
          </div>
        );
      default:
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
              type={field.key.includes('email') ? 'email' : 'text'}
              value={value}
              onChange={(e) => updateAnswer(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );
    }
  }

  const standardFee = estoppelSettings.standard_fee;
  const expeditedEnabled = estoppelSettings.expedited_fee_enabled !== false;
  const expeditedFee = estoppelSettings.expedited_fee;
  const delinquentEnabled = estoppelSettings.delinquent_surcharge_enabled !== false;
  const selectedFee = (requestType === 'expedited' && expeditedEnabled) ? expeditedFee : standardFee;
  const formatFee = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  async function handleSubmit() {
    // Validate required fields
    for (const field of requesterFieldDefs) {
      if (field.required && !answers[field.key]?.trim()) {
        toast.error(`Please fill in: ${field.label}`);
        return;
      }
    }

    // Validate delivery email
    const deliveryEmail = answers.delivery_email?.trim();
    if (!deliveryEmail) {
      toast.error('Please provide a delivery email address.');
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = window.location.origin;
      const response = await fetch('/api/estoppel/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId,
          requesterFields: answers,
          requestType,
          deliveryEmail,
          successUrl: `${baseUrl}/${communitySlug}/estoppel?success=true`,
          cancelUrl: `${baseUrl}/${communitySlug}/estoppel`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Estoppel checkout error:', err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-panel p-6 space-y-6">
      {/* Requester Fields */}
      <div className="space-y-4">
        <h2 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          Request Information
        </h2>
        {requesterFieldDefs.map(renderField)}
      </div>

      {/* Request Type */}
      <div className="border-t border-stroke-light dark:border-stroke-dark pt-6 space-y-3">
        <h2 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          Request Type
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRequestType('standard')}
            className={`p-4 rounded-inner-card border text-left transition-colors ${
              requestType === 'standard'
                ? 'border-secondary-400 bg-secondary-400/5'
                : 'border-stroke-light dark:border-stroke-dark hover:border-secondary-400/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
                Standard
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {formatFee(standardFee)}
              </Badge>
            </div>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Processed within 10 business days per Florida Statute 720.30851
            </p>
          </button>

          {expeditedEnabled && (
            <button
              type="button"
              onClick={() => setRequestType('expedited')}
              className={`p-4 rounded-inner-card border text-left transition-colors ${
                requestType === 'expedited'
                  ? 'border-secondary-400 bg-secondary-400/5'
                  : 'border-stroke-light dark:border-stroke-dark hover:border-secondary-400/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
                  Expedited
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {formatFee(expeditedFee)}
                </Badge>
              </div>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Processed within 3 business days per Florida Statute 720.30851
              </p>
            </button>
          )}
        </div>
      </div>

      {/* Fee Summary */}
      <div className="border-t border-stroke-light dark:border-stroke-dark pt-6">
        <div className="bg-surface-light-2 dark:bg-surface-dark-2 rounded-inner-card p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              {requestType === 'expedited' ? 'Expedited' : 'Standard'} Certificate Fee
            </span>
            <span className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark">
              {formatFee(selectedFee)}
            </span>
          </div>
          {delinquentEnabled && estoppelSettings.delinquent_surcharge > 0 && (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              An additional {formatFee(estoppelSettings.delinquent_surcharge)} surcharge may apply
              if there is an outstanding balance on the account per Florida Statute 720.30851.
            </p>
          )}
        </div>
      </div>

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Redirecting to Payment...
          </>
        ) : (
          `Submit & Pay ${formatFee(selectedFee)}`
        )}
      </Button>

      <p className="text-meta text-text-muted-light dark:text-text-muted-dark text-center">
        Payment is processed securely via Stripe. You will be redirected to complete payment.
      </p>
    </div>
  );
}
