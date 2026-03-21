import type { PaymentFrequency } from '@/lib/types/database';

/**
 * Configuration for each payment frequency.
 * interval_count is used to compute the next billing anchor.
 */
const FREQUENCY_CONFIG: Record<PaymentFrequency, {
  interval: 'month' | 'year';
  interval_count: number;
  divisor: number;
}> = {
  monthly: { interval: 'month', interval_count: 1, divisor: 12 },
  quarterly: { interval: 'month', interval_count: 3, divisor: 4 },
  semi_annual: { interval: 'month', interval_count: 6, divisor: 2 },
  annual: { interval: 'year', interval_count: 1, divisor: 1 },
};

export { FREQUENCY_CONFIG };

/**
 * Compute the next billing cycle anchor (Unix timestamp) for a given
 * billing day and payment frequency. The anchor is always in the future.
 */
export function computeNextBillingAnchor(
  billingDay: number,
  frequency: PaymentFrequency,
): number {
  const config = FREQUENCY_CONFIG[frequency];
  const now = new Date();
  const currentDay = now.getUTCDate();

  let anchorDate: Date;

  if (frequency === 'annual') {
    if (currentDay < billingDay && now.getUTCMonth() === 0) {
      anchorDate = new Date(Date.UTC(now.getUTCFullYear(), 0, billingDay, 0, 0, 0));
    } else {
      anchorDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, billingDay, 0, 0, 0));
    }
  } else {
    if (currentDay < billingDay) {
      anchorDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), billingDay, 0, 0, 0));
    } else {
      anchorDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + config.interval_count, billingDay, 0, 0, 0));
    }
  }

  // Ensure anchor is in the future
  if (anchorDate.getTime() <= now.getTime()) {
    if (frequency === 'annual') {
      anchorDate = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, billingDay, 0, 0, 0));
    } else {
      anchorDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + config.interval_count, billingDay, 0, 0, 0));
    }
  }

  return Math.floor(anchorDate.getTime() / 1000);
}
