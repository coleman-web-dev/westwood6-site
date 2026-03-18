import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface ViolationReportNotificationProps {
  communityName: string;
  reporterName: string;
  violationTitle: string;
  category: string;
  severity: string;
  description?: string;
  reportedLocation?: string;
  reportedUnitNumber?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function ViolationReportNotification({
  communityName,
  reporterName,
  violationTitle,
  category,
  severity,
  description,
  reportedLocation,
  reportedUnitNumber,
  dashboardUrl,
  unsubscribeUrl,
}: ViolationReportNotificationProps) {
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

  const locationParts: string[] = [];
  if (reportedUnitNumber) locationParts.push(`Unit ${reportedUnitNumber}`);
  if (reportedLocation) locationParts.push(reportedLocation);
  const locationText = locationParts.length > 0 ? locationParts.join(' - ') : null;

  return (
    <EmailLayout
      preview={`New violation report: ${violationTitle}`}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={headingStyle}>New Violation Report</Text>
      <Text style={bodyStyle}>
        {reporterName} has reported a violation in {communityName}.
      </Text>

      <Section style={detailBoxStyle}>
        <Text style={detailLabelStyle}>Title</Text>
        <Text style={detailValueStyle}>{violationTitle}</Text>

        <Text style={detailLabelStyle}>Category</Text>
        <Text style={detailValueStyle}>{categoryLabel}</Text>

        <Text style={detailLabelStyle}>Severity</Text>
        <Text style={detailValueStyle}>{severityLabel}</Text>

        {locationText && (
          <>
            <Text style={detailLabelStyle}>Location</Text>
            <Text style={detailValueStyle}>{locationText}</Text>
          </>
        )}

        {description && (
          <>
            <Text style={detailLabelStyle}>Description</Text>
            <Text style={detailValueStyle}>
              {description.length > 200 ? description.substring(0, 200) + '...' : description}
            </Text>
          </>
        )}
      </Section>

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
  lineHeight: '22px',
  color: '#4a4a68',
  margin: '0 0 20px 0',
};

const detailBoxStyle: React.CSSProperties = {
  backgroundColor: '#f8f8fc',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 24px 0',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#8888a0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '8px 0 2px 0',
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#1a1a2e',
  margin: '0 0 4px 0',
};

const ctaStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#1D2024',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '10px 24px',
  borderRadius: '8px',
};
