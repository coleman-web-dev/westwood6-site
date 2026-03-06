import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date();

  // Get all communities with active delinquency rules
  const { data: rules } = await admin
    .from('delinquency_rules')
    .select('*, communities!inner(id, name, slug)')
    .eq('is_active', true)
    .order('step_order');

  if (!rules || rules.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Group rules by community
  const rulesByComm = new Map<string, typeof rules>();
  for (const rule of rules) {
    const existing = rulesByComm.get(rule.community_id) || [];
    existing.push(rule);
    rulesByComm.set(rule.community_id, existing);
  }

  let actionsTaken = 0;

  for (const [communityId, communityRules] of rulesByComm) {
    // Get overdue invoices
    const { data: overdueInvoices } = await admin
      .from('invoices')
      .select('id, unit_id, amount, amount_paid, due_date, status, units!inner(unit_number, members!inner(email, first_name, last_name))')
      .eq('community_id', communityId)
      .in('status', ['overdue', 'partial'])
      .not('due_date', 'is', null);

    if (!overdueInvoices) continue;

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue < 0) continue;

      // Get actions already taken for this invoice
      const { data: existingActions } = await admin
        .from('delinquency_actions')
        .select('rule_id')
        .eq('invoice_id', invoice.id);

      const completedRuleIds = new Set((existingActions || []).map((a) => a.rule_id));

      // Find the next applicable rule
      for (const rule of communityRules) {
        if (completedRuleIds.has(rule.id)) continue;
        if (daysOverdue < rule.days_overdue) continue;

        // Get member email from the unit
        const unit = invoice.units as unknown as {
          unit_number: string;
          members: { email: string; first_name: string; last_name: string }[];
        };
        const member = unit?.members?.[0];
        if (!member?.email) continue;

        // Queue email
        const emailBody = rule.email_body
          .replace('{{unit_number}}', unit.unit_number)
          .replace('{{amount_due}}', `$${((invoice.amount - (invoice.amount_paid || 0)) / 100).toFixed(2)}`)
          .replace('{{days_overdue}}', String(daysOverdue))
          .replace('{{homeowner_name}}', `${member.first_name} ${member.last_name}`);

        await admin.from('email_queue').insert({
          community_id: communityId,
          recipient_email: member.email,
          recipient_name: `${member.first_name} ${member.last_name}`,
          category: 'payment',
          subject: rule.email_subject,
          template_id: 'delinquency-notice',
          template_data: { body: emailBody, action_type: rule.action_type },
        });

        // Log the action
        await admin.from('delinquency_actions').insert({
          community_id: communityId,
          invoice_id: invoice.id,
          unit_id: invoice.unit_id,
          rule_id: rule.id,
          action_type: rule.action_type,
          email_sent: true,
          late_fee_applied: false,
        });

        actionsTaken++;
        break; // Only apply one rule per invoice per run
      }
    }
  }

  return NextResponse.json({ actionsTaken });
}
