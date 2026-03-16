import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface BallotNotificationEmailProps {
  communityName: string;
  ballotTitle: string;
  ballotType: string;
  variant: 'opened' | 'closed' | 'results_published';
  closesAt?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

const VARIANT_CONFIG = {
  opened: {
    heading: 'Voting is Now Open',
    buttonText: 'Cast Your Vote',
    badgeColor: '#22c55e',
    badgeBg: '#dcfce7',
    badgeLabel: 'OPEN',
  },
  closed: {
    heading: 'Voting Has Closed',
    buttonText: 'View Details',
    badgeColor: '#6b7280',
    badgeBg: '#f3f4f6',
    badgeLabel: 'CLOSED',
  },
  results_published: {
    heading: 'Results Are Available',
    buttonText: 'View Results',
    badgeColor: '#3b82f6',
    badgeBg: '#dbeafe',
    badgeLabel: 'RESULTS',
  },
};

export function BallotNotificationEmail({
  communityName,
  ballotTitle,
  ballotType,
  variant,
  closesAt,
  dashboardUrl,
  unsubscribeUrl,
}: BallotNotificationEmailProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <EmailLayout
      preview={`${config.heading}: ${ballotTitle}`}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ display: 'inline-block', marginBottom: '12px' }}>
        <Text style={{
          backgroundColor: config.badgeBg,
          color: config.badgeColor,
          borderRadius: '4px',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.5px',
          margin: '0',
          display: 'inline-block',
        }}>
          {config.badgeLabel}
        </Text>
      </Section>

      <Text style={headingStyle}>{config.heading}</Text>

      <Text style={bodyStyle}>{ballotTitle}</Text>

      <Text style={metaStyle}>Type: {ballotType}</Text>

      {variant === 'opened' && closesAt && (
        <Text style={metaStyle}>
          Cast your vote by {closesAt}.
        </Text>
      )}

      {variant === 'closed' && (
        <Text style={metaStyle}>
          Results will be published soon.
        </Text>
      )}

      {variant === 'results_published' && (
        <Text style={metaStyle}>
          View the official results in your dashboard.
        </Text>
      )}

      <Section style={ctaStyle}>
        <Link href={dashboardUrl} style={buttonStyle}>
          {config.buttonText}
        </Link>
      </Section>
    </EmailLayout>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#1a1a2e',
  margin: '0 0 8px 0',
};

const bodyStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#1a1a2e',
  fontWeight: '500',
  margin: '0 0 8px 0',
};

const metaStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#525f7f',
  lineHeight: '22px',
  margin: '0 0 8px 0',
};

const ctaStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  marginTop: '24px',
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
