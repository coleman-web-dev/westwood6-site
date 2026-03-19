import { Text, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface PaymentConfirmationProps {
  communityName: string;
  invoiceTitle: string;
  amount: number; // amount paid in cents
  paidAt: string;
  walletBalance?: number; // in cents
  paymentDescription?: string; // e.g. "$168.00 paid via credit card"
  unsubscribeUrl?: string;
}

export function PaymentConfirmationEmail({
  communityName,
  invoiceTitle,
  amount,
  paidAt,
  walletBalance,
  paymentDescription,
  unsubscribeUrl,
}: PaymentConfirmationProps) {
  const formattedAmount = `$${(amount / 100).toFixed(2)}`;
  const formattedDate = new Date(paidAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const walletLine =
    walletBalance !== undefined && walletBalance > 0
      ? `Account credit balance: $${(walletBalance / 100).toFixed(2)}`
      : null;

  return (
    <EmailLayout
      preview={`Payment of ${formattedAmount} received for ${invoiceTitle}`}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={headingStyle}>Payment Received</Text>
      <Text style={textStyle}>
        Your payment has been processed successfully.
      </Text>

      <Section style={detailsBoxStyle}>
        <Text style={detailLabelStyle}>Invoice</Text>
        <Text style={detailValueStyle}>{invoiceTitle}</Text>
        <Text style={detailLabelStyle}>Amount Due</Text>
        <Text style={zeroDueStyle}>$0.00</Text>
        <Text style={detailLabelStyle}>Payment</Text>
        <Text style={detailValueStyle}>
          {paymentDescription || `${formattedAmount} paid`}
        </Text>
        <Text style={detailLabelStyle}>Date</Text>
        <Text style={detailValueStyle}>{formattedDate}</Text>
      </Section>

      {walletLine && (
        <Text style={walletStyle}>{walletLine}</Text>
      )}

      <Text style={textStyle}>
        Thank you for your payment.
      </Text>
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

const zeroDueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#16a34a',
  margin: '0 0 12px 0',
};

const walletStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8898aa',
  fontStyle: 'italic',
  margin: '0 0 16px 0',
};
