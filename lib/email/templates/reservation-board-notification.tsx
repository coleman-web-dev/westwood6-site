import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface ReservationBoardNotificationEmailProps {
  communityName: string;
  amenityName: string;
  memberName: string;
  unitNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  guestCount?: string;
  fee?: string;
  deposit?: string;
  status: 'pending' | 'approved';
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function ReservationBoardNotificationEmail({
  communityName,
  amenityName,
  memberName,
  unitNumber,
  date,
  startTime,
  endTime,
  purpose,
  guestCount,
  fee,
  deposit,
  status,
  dashboardUrl,
  unsubscribeUrl,
}: ReservationBoardNotificationEmailProps) {
  const isPending = status === 'pending';
  const preview = isPending
    ? `New reservation request: ${amenityName} on ${date}`
    : `New reservation: ${amenityName} on ${date}`;

  return (
    <EmailLayout
      preview={preview}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={isPending ? badgePendingStyle : badgeApprovedStyle}>
        <Text style={isPending ? badgePendingTextStyle : badgeApprovedTextStyle}>
          {isPending ? 'NEW RESERVATION REQUEST' : 'NEW RESERVATION'}
        </Text>
      </Section>

      <Text style={headingStyle}>{amenityName}</Text>

      <Section style={detailsStyle}>
        <Text style={detailLabelStyle}>Resident</Text>
        <Text style={detailValueStyle}>
          {memberName} (Unit {unitNumber})
        </Text>

        <Text style={detailLabelStyle}>When</Text>
        <Text style={detailValueStyle}>
          {date}, {startTime} to {endTime}
        </Text>

        {purpose && (
          <>
            <Text style={detailLabelStyle}>Purpose</Text>
            <Text style={detailValueStyle}>{purpose}</Text>
          </>
        )}

        {guestCount && (
          <>
            <Text style={detailLabelStyle}>Expected Guests</Text>
            <Text style={detailValueStyle}>{guestCount}</Text>
          </>
        )}

        {fee && fee !== '$0.00' && (
          <>
            <Text style={detailLabelStyle}>Rental Fee</Text>
            <Text style={detailValueStyle}>{fee}</Text>
          </>
        )}

        {deposit && deposit !== '$0.00' && (
          <>
            <Text style={detailLabelStyle}>Security Deposit</Text>
            <Text style={detailValueStyle}>{deposit}</Text>
          </>
        )}
      </Section>

      {isPending && (
        <Text style={bodyStyle}>
          This reservation requires board approval. Please review and approve or deny the request.
        </Text>
      )}

      <Section style={ctaStyle}>
        <Link href={dashboardUrl} style={buttonStyle}>
          {isPending ? 'Review Reservation' : 'View Reservation'}
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

const badgePendingStyle: React.CSSProperties = {
  backgroundColor: '#fef3c7',
  borderRadius: '4px',
  padding: '4px 12px',
  display: 'inline-block',
  marginBottom: '12px',
};

const badgePendingTextStyle: React.CSSProperties = {
  color: '#b45309',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  margin: '0',
};

const badgeApprovedStyle: React.CSSProperties = {
  backgroundColor: '#dbeafe',
  borderRadius: '4px',
  padding: '4px 12px',
  display: 'inline-block',
  marginBottom: '12px',
};

const badgeApprovedTextStyle: React.CSSProperties = {
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
