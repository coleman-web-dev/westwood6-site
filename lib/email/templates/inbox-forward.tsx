import { Text, Link, Section, Hr } from '@react-email/components';
import { EmailLayout } from './layout';

interface InboxForwardEmailProps {
  communityName: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  emailUrl: string;
  recipientName: string;
}

export function InboxForwardEmail({
  communityName,
  fromName,
  fromAddress,
  subject,
  snippet,
  emailUrl,
  recipientName,
}: InboxForwardEmailProps) {
  return (
    <EmailLayout
      preview={`New email from ${fromName}: ${subject}`}
      communityName={communityName}
    >
      <Text style={greetingStyle}>Hi {recipientName},</Text>

      <Text style={bodyStyle}>
        Your community inbox received a new email.
      </Text>

      <Section style={emailCardStyle}>
        <Text style={fromStyle}>
          From: {fromName} &lt;{fromAddress}&gt;
        </Text>
        <Text style={subjectStyle}>{subject}</Text>
        {snippet && (
          <>
            <Hr style={dividerStyle} />
            <Text style={snippetStyle}>{snippet}</Text>
          </>
        )}
      </Section>

      <Section style={ctaStyle}>
        <Link href={emailUrl} style={buttonStyle}>
          View in DuesIQ
        </Link>
      </Section>

      <Text style={footerNoteStyle}>
        You are receiving this because you have forwarding enabled for the {communityName} community inbox.
      </Text>
    </EmailLayout>
  );
}

const greetingStyle = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 8px',
};

const bodyStyle = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const emailCardStyle = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  border: '1px solid #e5e7eb',
  margin: '0 0 24px',
};

const fromStyle = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#6b7280',
  margin: '0 0 4px',
};

const subjectStyle = {
  fontSize: '15px',
  lineHeight: '22px',
  fontWeight: '600' as const,
  color: '#111827',
  margin: '0',
};

const dividerStyle = {
  borderColor: '#e5e7eb',
  margin: '12px 0',
};

const snippetStyle = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#6b7280',
  margin: '0',
};

const ctaStyle = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const buttonStyle = {
  backgroundColor: '#1D2024',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  padding: '10px 24px',
  borderRadius: '8px',
  display: 'inline-block',
};

const footerNoteStyle = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#9ca3af',
  margin: '0',
};
