import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './layout';

interface CheckApprovalEmailProps {
  signerName: string;
  checkNumber: number;
  payeeName: string;
  amount: number; // cents
  memo: string;
  date: string;
  communityName: string;
  reviewUrl: string;
}

export function CheckApprovalEmail({
  signerName,
  checkNumber,
  payeeName,
  amount,
  memo,
  date,
  communityName,
  reviewUrl,
}: CheckApprovalEmailProps) {
  const formattedAmount = (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <EmailLayout preview={`Check #${checkNumber} requires your approval`} communityName={communityName}>
      <Heading as="h2" style={headingStyle}>
        Check Approval Request
      </Heading>

      <Text style={textStyle}>Hi {signerName},</Text>

      <Text style={textStyle}>
        A check has been written that requires your signature and approval before it can be printed.
      </Text>

      <table style={detailsTableStyle}>
        <tbody>
          <tr>
            <td style={labelCellStyle}>Check #</td>
            <td style={valueCellStyle}>{checkNumber}</td>
          </tr>
          <tr>
            <td style={labelCellStyle}>Payee</td>
            <td style={valueCellStyle}>{payeeName}</td>
          </tr>
          <tr>
            <td style={labelCellStyle}>Amount</td>
            <td style={valueCellStyle}>{formattedAmount}</td>
          </tr>
          <tr>
            <td style={labelCellStyle}>Date</td>
            <td style={valueCellStyle}>{date}</td>
          </tr>
          {memo && (
            <tr>
              <td style={labelCellStyle}>Memo</td>
              <td style={valueCellStyle}>{memo}</td>
            </tr>
          )}
        </tbody>
      </table>

      <Button href={reviewUrl} style={buttonStyle}>
        Review & Approve
      </Button>

      <Text style={footerTextStyle}>
        You can also log in to DuesIQ and navigate to the Accounting section to review this check.
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
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 12px 0',
};

const detailsTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '16px 0 24px 0',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const labelCellStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#6b7280',
  width: '100px',
  borderBottom: '1px solid #e5e7eb',
};

const valueCellStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '14px',
  color: '#111827',
  borderBottom: '1px solid #e5e7eb',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#1a1a2e',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '0 0 16px 0',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '16px 0 0 0',
};

export default CheckApprovalEmail;
