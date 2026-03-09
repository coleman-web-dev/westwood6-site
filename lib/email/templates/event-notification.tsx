import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface EventNotificationEmailProps {
  communityName: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endTime: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function EventNotificationEmail({
  communityName,
  title,
  description,
  location,
  startDate,
  startTime,
  endTime,
  dashboardUrl,
  unsubscribeUrl,
}: EventNotificationEmailProps) {
  const preview = `New event: ${title} on ${startDate}`;

  return (
    <EmailLayout
      preview={preview}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={badgeStyle}>
        <Text style={badgeTextStyle}>NEW EVENT</Text>
      </Section>

      <Text style={headingStyle}>{title}</Text>

      <Section style={detailsStyle}>
        <Text style={detailLabelStyle}>When</Text>
        <Text style={detailValueStyle}>
          {startDate}, {startTime} to {endTime}
        </Text>

        {location && (
          <>
            <Text style={detailLabelStyle}>Where</Text>
            <Text style={detailValueStyle}>{location}</Text>
          </>
        )}
      </Section>

      {description && (
        <Text style={bodyStyle}>
          {description.length > 300 ? description.substring(0, 300) + '...' : description}
        </Text>
      )}

      <Section style={ctaStyle}>
        <Link href={dashboardUrl} style={buttonStyle}>
          View Event Details
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

const badgeStyle: React.CSSProperties = {
  backgroundColor: '#dbeafe',
  borderRadius: '4px',
  padding: '4px 12px',
  display: 'inline-block',
  marginBottom: '12px',
};

const badgeTextStyle: React.CSSProperties = {
  color: '#1d4ed8',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: '0',
};

const detailsStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '12px 16px',
  marginBottom: '16px',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#8898aa',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 2px 0',
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#1a1a2e',
  lineHeight: '20px',
  margin: '0 0 10px 0',
};

const bodyStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#525f7f',
  lineHeight: '24px',
  margin: '0 0 24px 0',
  whiteSpace: 'pre-line',
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
