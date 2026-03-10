import { describe, it, expect } from 'vitest';
import {
  getPeriods,
  getSpecialAssessmentPeriods,
  generateInvoicesForAssessment,
  generateRemainingInvoicesForUnit,
} from '@/lib/utils/generate-assessment-invoices';
import {
  COMMUNITY_ID,
  ASSESSMENT_ID,
  UNIT_1_ID,
  UNIT_2_ID,
  makeAssessment,
  makeUnit,
} from '../helpers/fixtures';

// ─── getPeriods() ────────────────────────────────────────────────────────────

describe('getPeriods', () => {
  it('returns 12 monthly periods for a full calendar year', () => {
    const periods = getPeriods('monthly', '2026-01-01', '2026-12-01');
    expect(periods).toHaveLength(12);
    expect(periods[0].label).toBe('January 2026');
    expect(periods[0].dueDate).toBe('2026-01-01');
    expect(periods[11].label).toBe('December 2026');
    expect(periods[11].dueDate).toBe('2026-12-01');
  });

  it('returns 4 quarterly periods for a full calendar year', () => {
    const periods = getPeriods('quarterly', '2026-01-01', '2026-12-01');
    expect(periods).toHaveLength(4);
    expect(periods[0].label).toBe('Q1 2026');
    expect(periods[0].dueDate).toBe('2026-01-01');
    expect(periods[1].label).toBe('Q2 2026');
    expect(periods[1].dueDate).toBe('2026-04-01');
    expect(periods[2].label).toBe('Q3 2026');
    expect(periods[2].dueDate).toBe('2026-07-01');
    expect(periods[3].label).toBe('Q4 2026');
    expect(periods[3].dueDate).toBe('2026-10-01');
  });

  it('returns 2 semi-annual periods for a full calendar year', () => {
    const periods = getPeriods('semi_annual', '2026-01-01', '2026-12-01');
    expect(periods).toHaveLength(2);
    expect(periods[0].label).toBe('H1 2026');
    expect(periods[0].dueDate).toBe('2026-01-01');
    expect(periods[1].label).toBe('H2 2026');
    expect(periods[1].dueDate).toBe('2026-07-01');
  });

  it('returns 1 annual period', () => {
    const periods = getPeriods('annual', '2026-01-01', '2026-12-31');
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('2026');
    expect(periods[0].dueDate).toBe('2026-01-01');
  });

  it('handles partial year (6 months)', () => {
    const periods = getPeriods('monthly', '2026-07-01', '2026-12-01');
    expect(periods).toHaveLength(6);
    expect(periods[0].label).toBe('July 2026');
    expect(periods[5].label).toBe('December 2026');
  });

  it('returns 1 period when start equals end (monthly)', () => {
    const periods = getPeriods('monthly', '2026-06-01', '2026-06-01');
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('June 2026');
  });

  it('returns 0 periods when start is after end', () => {
    const periods = getPeriods('monthly', '2026-12-01', '2026-01-01');
    expect(periods).toHaveLength(0);
  });

  it('handles fiscal year crossing calendar year boundary', () => {
    const periods = getPeriods('quarterly', '2025-10-01', '2026-09-01');
    expect(periods).toHaveLength(4);
    expect(periods[0].label).toBe('Q1 2025');
    expect(periods[0].dueDate).toBe('2025-10-01');
    expect(periods[3].label).toBe('Q4 2026');
    expect(periods[3].dueDate).toBe('2026-07-01');
  });

  it('produces correct due date formatting with zero-padded months', () => {
    const periods = getPeriods('monthly', '2026-01-01', '2026-09-01');
    // All months should be zero-padded
    for (const p of periods) {
      expect(p.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ─── getSpecialAssessmentPeriods() ───────────────────────────────────────────

describe('getSpecialAssessmentPeriods', () => {
  it('returns a single lump sum period for 1 installment', () => {
    const periods = getSpecialAssessmentPeriods(1, '2026-05-15');
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('Lump Sum');
    expect(periods[0].dueDate).toBe('2026-05-15');
  });

  it('returns 3 monthly installment periods', () => {
    const periods = getSpecialAssessmentPeriods(3, '2026-05-01');
    expect(periods).toHaveLength(3);
    expect(periods[0].label).toBe('Installment 1 of 3');
    expect(periods[0].dueDate).toBe('2026-05-01');
    expect(periods[1].label).toBe('Installment 2 of 3');
    expect(periods[1].dueDate).toBe('2026-06-01');
    expect(periods[2].label).toBe('Installment 3 of 3');
    expect(periods[2].dueDate).toBe('2026-07-01');
  });

  it('returns 12 monthly installment periods', () => {
    const periods = getSpecialAssessmentPeriods(12, '2026-01-01');
    expect(periods).toHaveLength(12);
    expect(periods[0].dueDate).toBe('2026-01-01');
    expect(periods[11].dueDate).toBe('2026-12-01');
  });

  it('returns empty array for 0 installments', () => {
    const periods = getSpecialAssessmentPeriods(0, '2026-01-01');
    expect(periods).toHaveLength(0);
  });

  it('returns empty array for negative installments', () => {
    const periods = getSpecialAssessmentPeriods(-1, '2026-01-01');
    expect(periods).toHaveLength(0);
  });

  it('wraps correctly around year boundary', () => {
    const periods = getSpecialAssessmentPeriods(4, '2026-11-01');
    expect(periods).toHaveLength(4);
    expect(periods[0].dueDate).toBe('2026-11-01');
    expect(periods[1].dueDate).toBe('2026-12-01');
    expect(periods[2].dueDate).toBe('2027-01-01');
    expect(periods[3].dueDate).toBe('2027-02-01');
  });
});

// ─── generateInvoicesForAssessment() ─────────────────────────────────────────

describe('generateInvoicesForAssessment', () => {
  it('generates 12 monthly invoices for 1 unit at $10,000/month ($120,000 annual)', () => {
    const assessment = makeAssessment({ annual_amount: 120000 });
    const units = [makeUnit()];

    const invoices = generateInvoicesForAssessment(assessment, units, 'monthly');

    expect(invoices).toHaveLength(12);
    // Each invoice should be $10,000 (120,000 / 12)
    for (const inv of invoices) {
      expect(inv.amount).toBe(10000);
    }
  });

  it('generates 4 quarterly invoices with correct amounts', () => {
    const assessment = makeAssessment({ annual_amount: 120000 });
    const units = [makeUnit()];

    const invoices = generateInvoicesForAssessment(assessment, units, 'quarterly');

    expect(invoices).toHaveLength(4);
    for (const inv of invoices) {
      expect(inv.amount).toBe(30000);
    }
  });

  it('places rounding remainder on the last invoice', () => {
    // $100.01 = 10001 cents / 4 quarters = 2500.25 cents each
    // Math.round(10001/4) = 2500, remainder = 10001 - (2500*4) = 1
    const assessment = makeAssessment({ annual_amount: 10001 });
    const units = [makeUnit()];

    const invoices = generateInvoicesForAssessment(assessment, units, 'quarterly');

    expect(invoices).toHaveLength(4);
    expect(invoices[0].amount).toBe(2500);
    expect(invoices[1].amount).toBe(2500);
    expect(invoices[2].amount).toBe(2500);
    expect(invoices[3].amount).toBe(2501); // remainder goes to last

    // Total should still be exact
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    expect(total).toBe(10001);
  });

  it('distributes evenly when amount divides cleanly', () => {
    const assessment = makeAssessment({ annual_amount: 10000 });
    const units = [makeUnit()];

    const invoices = generateInvoicesForAssessment(assessment, units, 'quarterly');

    expect(invoices).toHaveLength(4);
    for (const inv of invoices) {
      expect(inv.amount).toBe(2500);
    }
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    expect(total).toBe(10000);
  });

  it('generates invoices for multiple units with different frequencies', () => {
    const assessment = makeAssessment({ annual_amount: 12000 });
    const units = [
      makeUnit({ id: UNIT_1_ID, payment_frequency: 'monthly' }),
      makeUnit({ id: UNIT_2_ID, payment_frequency: 'quarterly' }),
    ];

    const invoices = generateInvoicesForAssessment(assessment, units, 'monthly');

    // Unit 1: 12 monthly invoices, Unit 2: 4 quarterly invoices
    expect(invoices).toHaveLength(16);

    const unit1Invoices = invoices.filter((inv) => inv.unit_id === UNIT_1_ID);
    const unit2Invoices = invoices.filter((inv) => inv.unit_id === UNIT_2_ID);
    expect(unit1Invoices).toHaveLength(12);
    expect(unit2Invoices).toHaveLength(4);

    // Each unit's invoices should sum to the annual amount
    const unit1Total = unit1Invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const unit2Total = unit2Invoices.reduce((sum, inv) => sum + inv.amount, 0);
    expect(unit1Total).toBe(12000);
    expect(unit2Total).toBe(12000);
  });

  it('uses community default frequency when unit frequency is null', () => {
    const assessment = makeAssessment({ annual_amount: 12000 });
    const units = [makeUnit({ payment_frequency: null })];

    const invoices = generateInvoicesForAssessment(assessment, units, 'quarterly');

    expect(invoices).toHaveLength(4); // Falls back to quarterly default
  });

  it('returns empty array for zero units', () => {
    const assessment = makeAssessment();
    const invoices = generateInvoicesForAssessment(assessment, [], 'monthly');
    expect(invoices).toHaveLength(0);
  });

  it('propagates community_id and assessment_id correctly', () => {
    const assessment = makeAssessment();
    const units = [makeUnit()];

    const invoices = generateInvoicesForAssessment(assessment, units, 'monthly');

    for (const inv of invoices) {
      expect(inv.community_id).toBe(COMMUNITY_ID);
      expect(inv.assessment_id).toBe(ASSESSMENT_ID);
      expect(inv.unit_id).toBe(UNIT_1_ID);
      expect(inv.status).toBe('pending');
    }
  });

  it('includes assessment title and period label in invoice title', () => {
    const assessment = makeAssessment({ title: 'Annual Dues 2026' });
    const units = [makeUnit()];

    const invoices = generateInvoicesForAssessment(assessment, units, 'monthly');

    expect(invoices[0].title).toBe('Annual Dues 2026 - January 2026');
    expect(invoices[11].title).toBe('Annual Dues 2026 - December 2026');
  });

  it('generates special assessment with installments', () => {
    const assessment = makeAssessment({
      type: 'special',
      annual_amount: 30000, // $300.00
      installments: 3,
      installment_start_date: '2026-06-01',
    });
    const units = [makeUnit()];

    const invoices = generateInvoicesForAssessment(assessment, units, 'monthly');

    expect(invoices).toHaveLength(3);
    expect(invoices[0].amount).toBe(10000); // $100.00 each
    expect(invoices[1].amount).toBe(10000);
    expect(invoices[2].amount).toBe(10000);

    expect(invoices[0].title).toContain('Installment 1 of 3');
    expect(invoices[0].due_date).toBe('2026-06-01');
    expect(invoices[2].due_date).toBe('2026-08-01');
  });

  it('handles special assessment with rounding on installments', () => {
    const assessment = makeAssessment({
      type: 'special',
      annual_amount: 10000, // $100.00
      installments: 3,
      installment_start_date: '2026-06-01',
    });
    const units = [makeUnit()];

    const invoices = generateInvoicesForAssessment(assessment, units, 'monthly');

    expect(invoices).toHaveLength(3);
    // 10000 / 3 = 3333.33 -> Math.round = 3333, remainder = 10000 - (3333*3) = 1
    expect(invoices[0].amount).toBe(3333);
    expect(invoices[1].amount).toBe(3333);
    expect(invoices[2].amount).toBe(3334); // remainder

    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    expect(total).toBe(10000);
  });

  it('generates 1 annual invoice', () => {
    const assessment = makeAssessment({ annual_amount: 120000 });
    const units = [makeUnit({ payment_frequency: 'annual' })];

    const invoices = generateInvoicesForAssessment(assessment, units, 'annual');

    expect(invoices).toHaveLength(1);
    expect(invoices[0].amount).toBe(120000);
  });

  it('generates 2 semi-annual invoices', () => {
    const assessment = makeAssessment({ annual_amount: 120000 });
    const units = [makeUnit({ payment_frequency: 'semi_annual' })];

    const invoices = generateInvoicesForAssessment(assessment, units, 'semi_annual');

    expect(invoices).toHaveLength(2);
    expect(invoices[0].amount).toBe(60000);
    expect(invoices[1].amount).toBe(60000);
  });
});

// ─── generateRemainingInvoicesForUnit() ──────────────────────────────────────

describe('generateRemainingInvoicesForUnit', () => {
  it('generates invoices only for future periods', () => {
    // Use a far-future fiscal year so all periods are "future"
    const assessment = makeAssessment({
      annual_amount: 120000,
      fiscal_year_start: '2099-01-01',
      fiscal_year_end: '2099-12-31',
    });
    const unit = makeUnit();

    const invoices = generateRemainingInvoicesForUnit(assessment, unit, 'monthly', 0);

    // All 12 periods are in the future
    expect(invoices).toHaveLength(12);
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    expect(total).toBe(120000);
  });

  it('returns empty when fully paid', () => {
    const assessment = makeAssessment({
      annual_amount: 120000,
      fiscal_year_start: '2099-01-01',
      fiscal_year_end: '2099-12-31',
    });
    const unit = makeUnit();

    const invoices = generateRemainingInvoicesForUnit(assessment, unit, 'monthly', 120000);
    expect(invoices).toHaveLength(0);
  });

  it('returns empty when overpaid', () => {
    const assessment = makeAssessment({
      annual_amount: 120000,
      fiscal_year_start: '2099-01-01',
      fiscal_year_end: '2099-12-31',
    });
    const unit = makeUnit();

    const invoices = generateRemainingInvoicesForUnit(assessment, unit, 'monthly', 150000);
    expect(invoices).toHaveLength(0);
  });

  it('distributes remaining amount across future periods', () => {
    const assessment = makeAssessment({
      annual_amount: 120000,
      fiscal_year_start: '2099-01-01',
      fiscal_year_end: '2099-12-31',
    });
    const unit = makeUnit();

    // Already paid half
    const invoices = generateRemainingInvoicesForUnit(assessment, unit, 'monthly', 60000);

    // All 12 periods are in the future, remaining $600 split across 12
    expect(invoices).toHaveLength(12);
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    expect(total).toBe(60000);
  });

  it('returns empty when all periods are in the past', () => {
    const assessment = makeAssessment({
      annual_amount: 120000,
      fiscal_year_start: '2020-01-01',
      fiscal_year_end: '2020-12-31',
    });
    const unit = makeUnit();

    const invoices = generateRemainingInvoicesForUnit(assessment, unit, 'monthly', 0);
    expect(invoices).toHaveLength(0);
  });

  it('handles rounding for remaining invoices', () => {
    const assessment = makeAssessment({
      annual_amount: 100000, // $1,000.00
      fiscal_year_start: '2099-01-01',
      fiscal_year_end: '2099-12-31',
    });
    const unit = makeUnit();

    // Already paid $400, $600 remaining across 12 future months
    // 60000 / 12 = 5000 each, no remainder
    const invoices = generateRemainingInvoicesForUnit(assessment, unit, 'monthly', 40000);

    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    expect(total).toBe(60000);
  });

  it('all generated invoices have status pending', () => {
    const assessment = makeAssessment({
      fiscal_year_start: '2099-01-01',
      fiscal_year_end: '2099-12-31',
    });
    const unit = makeUnit();

    const invoices = generateRemainingInvoicesForUnit(assessment, unit, 'quarterly', 0);
    for (const inv of invoices) {
      expect(inv.status).toBe('pending');
    }
  });
});
