import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface VendorInsuranceReminderProps {
  communityName: string;
  vendorName: string;
  vendorCompany: string | null;
  insuranceExpiry: string;
  daysUntilExpiry: number;
  vendorDetailUrl: string;
  unsubscribeUrl?: string;
}

export function VendorInsuranceReminderEmail({
  communityName,
  vendorName,
  vendorCompany,
  insuranceExpiry,
  daysUntilExpiry,
  vendorDetailUrl,
  unsubscribeUrl,
}: VendorInsuranceReminderProps) {
  const formattedDate = new Date(insuranceExpiry + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isExpired = daysUntilExpiry <= 0;
  const urgencyLabel = isExpired
    ? 'Expired'
    : daysUntilExpiry <= 7
      ? 'Expiring Soon'
      : 'Upcoming Expiry';

  return (
    <EmailLayout
      preview={`${urgencyLabel}: ${vendorName} insurance ${isExpired ? 'has expired' : `expires ${formattedDate}`}`}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={headingStyle}>
        Vendor Insurance {urgencyLabel}
      </Text>
      <Text style={textStyle}>
        {isExpired
          ? `The insurance for the following vendor has expired. Please follow up to obtain updated documentation.`
          : `A vendor's insurance certificate is expiring in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please follow up to ensure coverage remains current.`}
      </Text>

      <Section style={detailsBoxStyle}>
        <Text style={detailLabelStyle}>Vendor</Text>
        <Text style={detailValueStyle}>
          {vendorName}{vendorCompany ? ` (${vendorCompany})` : ''}
        </Text>
        <Text style={detailLabelStyle}>Insurance Expiry</Text>
        <Text style={{ ...detailValueStyle, color: isExpired || daysUntilExpiry <= 7 ? '#dc2626' : '#32325d' }}>
          {formattedDate}{isExpired ? ' (Expired)' : ''}
        </Text>
        <Text style={detailLabelStyle}>Days Remaining</Text>
        <Text style={detailValueStyle}>
          {isExpired ? 'Expired' : `${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`}
        </Text>
      </Section>

      <Section style={ctaStyle}>
        <Link href={vendorDetailUrl} style={buttonStyle}>
          View Vendor Details
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
