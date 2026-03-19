import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { PaymentReminderEmail } from '@/lib/email/templates/payment-reminder';
import { PaymentConfirmationEmail } from '@/lib/email/templates/payment-confirmation';

// Dev-only email template preview
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const template = searchParams.get('template') || 'reminder';

  let html: string;

  if (template === 'confirmation') {
    html = await render(
      PaymentConfirmationEmail({
        communityName: 'Westwood Community Six',
        invoiceTitle: 'Q1 2026 HOA Dues',
        amount: 16800,
        paidAt: new Date().toISOString(),
        paymentDescription: '$168.00 paid online',
        walletBalance: 0,
        unsubscribeUrl: '#',
      })
    );
  } else if (template === 'confirmation-wallet') {
    html = await render(
      PaymentConfirmationEmail({
        communityName: 'Westwood Community Six',
        invoiceTitle: 'Q1 2026 HOA Dues',
        amount: 21000,
        paidAt: new Date().toISOString(),
        paymentDescription: '$210.00 paid online. $42.00 credited to your account.',
        walletBalance: 10000,
        unsubscribeUrl: '#',
      })
    );
  } else if (template === 'overdue') {
    html = await render(
      PaymentReminderEmail({
        communityName: 'Westwood Community Six',
        invoiceTitle: 'Q4 2025 HOA Dues',
        amount: 16800,
        dueDate: '2025-12-30',
        isOverdue: true,
        paymentUrl: '#',
        unsubscribeUrl: '#',
      })
    );
  } else {
    html = await render(
      PaymentReminderEmail({
        communityName: 'Westwood Community Six',
        invoiceTitle: 'Q1 2026 HOA Dues',
        amount: 16800,
        dueDate: '2026-04-01',
        isOverdue: false,
        paymentUrl: '#',
        unsubscribeUrl: '#',
      })
    );
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
