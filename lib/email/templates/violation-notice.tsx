import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface ViolationNoticeEmailProps {
  communityName: string;
  violationTitle: string;
  category: string;
  severity: string;
  noticeType: string;
  description?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function ViolationNoticeEmail({
  communityName,
  violationTitle,
  category,
  severity,
  noticeType,
  description,
  dashboardUrl,
  unsubscribeUrl,
}: ViolationNoticeEmailProps) {
  const noticeLabel = noticeType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <EmailLayout
      preview={`${noticeLabel}: ${violationTitle}`}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={badgeStyle}>
        <Text style={badgeTextStyle}>{noticeLabel.toUpperCase()}</Text>
      </Section>

      <Text style={headingStyle}>{violationTitle}</Text>

      <Text style={detailStyle}>
        Category: {category.charAt(0).toUpperCase() + category.slice(1)}
      </Text>
      <Text style={detailStyle}>
        Severity: {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Text>

      {description && (
        <Text style={bodyStyle}>
          {description.length > 300 ? description.substring(0, 300) + '...' : description}
        </Text>
      )}

      <Section style={ctaStyle}>
        <Link href={dashboardUrl} style={buttonStyle}>
          View & Respond
        </Link>
      </Section>

      <Text style={disclaimerStyle}>
        Please do not reply to this email. To respond to this violation or provide
        documentation, use the link above to view the violation on your community portal.
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

const detailStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#525f7f',
  margin: '0 0 4px 0',
};

const bodyStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#525f7f',
  lineHeight: '24px',
  margin: '16px 0 24px 0',
  whiteSpace: 'pre-line',
};

const badgeStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  borderRadius: '4px',
  padding: '4px 12px',
  display: 'inline-block',
  marginBottom: '12px',
};

const badgeTextStyle: React.CSSProperties = {
  color: '#dc2626',
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

const disclaimerStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8888a0',
  lineHeight: '18px',
  margin: '24px 0 0 0',
  textAlign: 'center' as const,
  fontStyle: 'italic',
};
