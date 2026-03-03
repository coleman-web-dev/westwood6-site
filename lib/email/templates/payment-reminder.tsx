import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface PaymentReminderProps {
  communityName: string;
  invoiceTitle: string;
  amount: number; // in cents
  dueDate: string;
  isOverdue: boolean;
  paymentUrl: string;
  unsubscribeUrl?: string;
}

export function PaymentReminderEmail({
  communityName,
  invoiceTitle,
  amount,
  dueDate,
  isOverdue,
  paymentUrl,
  unsubscribeUrl,
}: PaymentReminderProps) {
  const formattedAmount = `$${(amount / 100).toFixed(2)}`;
  const formattedDate = new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <EmailLayout
      preview={`${isOverdue ? 'Overdue' : 'Upcoming'}: ${invoiceTitle} - ${formattedAmount}`}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={headingStyle}>
        {isOverdue ? 'Overdue Notice' : 'Payment Reminder'}
      </Text>
      <Text style={textStyle}>
        {isOverdue
          ? `The following invoice is past due. Please submit payment at your earliest convenience.`
          : `This is a reminder that you have an upcoming payment due.`}
      </Text>

      <Section style={detailsBoxStyle}>
        <Text style={detailLabelStyle}>Invoice</Text>
        <Text style={detailValueStyle}>{invoiceTitle}</Text>
        <Text style={detailLabelStyle}>Amount Due</Text>
        <Text style={amountStyle}>{formattedAmount}</Text>
        <Text style={detailLabelStyle}>Due Date</Text>
        <Text style={{ ...detailValueStyle, color: isOverdue ? '#dc2626' : '#32325d' }}>
          {formattedDate}{isOverdue ? ' (Past Due)' : ''}
        </Text>
      </Section>

      <Section style={ctaStyle}>
        <Link href={paymentUrl} style={buttonStyle}>
          Pay Now
        </Link>
      </Section>
    </EmailLayout>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1a1a2e',
  margin: '0 0 16px 0',
};

const textStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#525f7f',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const detailsBoxStyle: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '16px 0',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8898aa',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 2px 0',
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#32325d',
  fontWeight: '500',
  margin: '0 0 12px 0',
};

const amountStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1a1a2e',
  margin: '0 0 12px 0',
};

const ctaStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  color: '#C4B08C',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
  display: 'inline-block',
};
