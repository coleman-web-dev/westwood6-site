import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface AnnouncementEmailProps {
  communityName: string;
  title: string;
  body: string;
  priority: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function AnnouncementEmail({
  communityName,
  title,
  body,
  priority,
  dashboardUrl,
  unsubscribeUrl,
}: AnnouncementEmailProps) {
  const preview = body.length > 100 ? body.substring(0, 100) + '...' : body;

  return (
    <EmailLayout
      preview={`${title} - ${preview}`}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      {priority === 'urgent' && (
        <Section style={urgentBadgeStyle}>
          <Text style={urgentTextStyle}>URGENT</Text>
        </Section>
      )}
      {priority === 'important' && (
        <Section style={importantBadgeStyle}>
          <Text style={importantTextStyle}>IMPORTANT</Text>
        </Section>
      )}

      <Text style={headingStyle}>{title}</Text>
      <Text style={bodyStyle}>{body.length > 300 ? body.substring(0, 300) + '...' : body}</Text>

      <Section style={ctaStyle}>
        <Link href={dashboardUrl} style={buttonStyle}>
          View in Dashboard
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

const bodyStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#525f7f',
  lineHeight: '24px',
  margin: '0 0 24px 0',
  whiteSpace: 'pre-line',
};

const urgentBadgeStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  borderRadius: '4px',
  padding: '4px 12px',
  display: 'inline-block',
  marginBottom: '12px',
};

const urgentTextStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: '0',
};

const importantBadgeStyle: React.CSSProperties = {
  backgroundColor: '#fef3c7',
  borderRadius: '4px',
  padding: '4px 12px',
  display: 'inline-block',
  marginBottom: '12px',
};

const importantTextStyle: React.CSSProperties = {
  color: '#d97706',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: '0',
};

const ctaStyle: React.CSSProperties = {
  textAlign: 'center' as const,
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
