import type { Assessment, PaymentFrequency, Unit } from '@/lib/types/database';

interface Period {
  label: string;
  dueDate: string; // YYYY-MM-DD
}

interface InvoiceRow {
  community_id: string;
  unit_id: string;
  assessment_id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: 'pending';
}

/**
 * Generate installment periods for a special assessment.
 * Returns N monthly periods starting from startDate.
 */
export function getSpecialAssessmentPeriods(
  installments: number,
  startDate: string
): Period[] {
  if (installments <= 0) return [];

  if (installments === 1) {
    const d = new Date(startDate + 'T00:00:00');
    return [{
      label: 'Lump Sum',
      dueDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    }];
  }

  const periods: Period[] = [];
  const cursor = new Date(startDate + 'T00:00:00');

  for (let i = 0; i < installments; i++) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    periods.push({
      label: `Installment ${i + 1} of ${installments}`,
      dueDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return periods;
}

/**
 * Given a frequency, fiscal start, and fiscal end, return an array of periods
 * with a label and due date for each invoice.
 */
export function getPeriods(
  frequency: PaymentFrequency,
  fiscalStart: string,
  fiscalEnd: string
): Period[] {
  const start = new Date(fiscalStart + 'T00:00:00');
  const end = new Date(fiscalEnd + 'T00:00:00');
  const periods: Period[] = [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  if (frequency === 'monthly') {
    const cursor = new Date(start);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      periods.push({
        label: `${monthNames[m]} ${y}`,
        dueDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (frequency === 'quarterly') {
    const cursor = new Date(start);
    let q = 1;
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      periods.push({
        label: `Q${q} ${y}`,
        dueDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
      });
      cursor.setMonth(cursor.getMonth() + 3);
      q++;
    }
  } else if (frequency === 'semi_annual') {
    const cursor = new Date(start);
    let h = 1;
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      periods.push({
        label: `H${h} ${y}`,
        dueDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
      });
      cursor.setMonth(cursor.getMonth() + 6);
      h++;
    }
  } else {
    // annual
    const y = start.getFullYear();
    const m = start.getMonth();
    periods.push({
      label: `${y}`,
      dueDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    });
  }

  return periods;
}

/**
 * Generate invoice rows for an assessment across all provided units.
 * Each unit's frequency falls back to the community default if not set.
 */
export function generateInvoicesForAssessment(
  assessment: Assessment,
  units: Unit[],
  defaultFrequency: PaymentFrequency
): InvoiceRow[] {
  const invoices: InvoiceRow[] = [];

  // Special assessments use installment periods; all units get the same schedule
  const isSpecial = assessment.type === 'special' && assessment.installments && assessment.installment_start_date;

  for (const unit of units) {
    const periods = isSpecial
      ? getSpecialAssessmentPeriods(assessment.installments!, assessment.installment_start_date!)
      : getPeriods(unit.payment_frequency ?? defaultFrequency, assessment.fiscal_year_start, assessment.fiscal_year_end);
    if (periods.length === 0) continue;

    const perPeriodAmount = Math.round(assessment.annual_amount / periods.length);
    // Distribute rounding remainder to last invoice
    const remainder = assessment.annual_amount - perPeriodAmount * periods.length;

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      invoices.push({
        community_id: assessment.community_id,
        unit_id: unit.id,
        assessment_id: assessment.id,
        title: `${assessment.title} - ${period.label}`,
        description: assessment.description,
        amount: perPeriodAmount + (i === periods.length - 1 ? remainder : 0),
        due_date: period.dueDate,
        status: 'pending',
      });
    }
  }

  return invoices;
}

/**
 * Generate invoices for a single unit when its frequency changes.
 * Only creates invoices for periods whose due date is in the future.
 */
export function generateRemainingInvoicesForUnit(
  assessment: Assessment,
  unit: Unit,
  newFrequency: PaymentFrequency,
  alreadyPaidAmount: number
): InvoiceRow[] {
  const periods = getPeriods(newFrequency, assessment.fiscal_year_start, assessment.fiscal_year_end);
  if (periods.length === 0) return [];

  const today = new Date().toISOString().split('T')[0];
  const futurePeriods = periods.filter((p) => p.dueDate >= today);
  if (futurePeriods.length === 0) return [];

  const remainingAmount = assessment.annual_amount - alreadyPaidAmount;
  if (remainingAmount <= 0) return [];

  const perPeriodAmount = Math.round(remainingAmount / futurePeriods.length);
  const remainder = remainingAmount - perPeriodAmount * futurePeriods.length;

  return futurePeriods.map((period, i) => ({
    community_id: assessment.community_id,
    unit_id: unit.id,
    assessment_id: assessment.id,
    title: `${assessment.title} - ${period.label}`,
    description: assessment.description,
    amount: perPeriodAmount + (i === futurePeriods.length - 1 ? remainder : 0),
    due_date: period.dueDate,
    status: 'pending' as const,
  }));
}
