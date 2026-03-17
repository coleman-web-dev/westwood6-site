import { Text, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface EstoppelCertificateEmailProps {
  communityName: string;
  propertyAddress: string;
  ownerNames: string;
  completionDate: string;
}

export function EstoppelCertificateEmail({
  communityName,
  propertyAddress,
  ownerNames,
  completionDate,
}: EstoppelCertificateEmailProps) {
  return (
    <EmailLayout
      preview={`Estoppel Certificate for ${propertyAddress} - ${communityName}`}
      communityName={communityName}
    >
      <Text style={headingStyle}>Estoppel Certificate</Text>
      <Text style={textStyle}>
        The estoppel certificate you requested has been completed and is attached to this email as a PDF.
      </Text>

      <Section style={detailsBoxStyle}>
        <Text style={detailLabelStyle}>Community</Text>
        <Text style={detailValueStyle}>{communityName}</Text>
        <Text style={detailLabelStyle}>Property</Text>
        <Text style={detailValueStyle}>{propertyAddress}</Text>
        <Text style={detailLabelStyle}>Owner(s)</Text>
        <Text style={detailValueStyle}>{ownerNames}</Text>
        <Text style={detailLabelStyle}>Date Completed</Text>
        <Text style={detailValueStyle}>{completionDate}</Text>
      </Section>

      <Text style={textStyle}>
        Please review the attached certificate. If you have any questions or believe any information is
        incorrect, please contact the association directly.
      </Text>

      <Text style={disclaimerStyle}>
        This certificate was generated electronically via DuesIQ. The information contained herein is
        believed to be accurate as of the date of completion. This certificate is provided in accordance
        with Florida Statute 720.30851.
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

const disclaimerStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8898aa',
  lineHeight: '18px',
  margin: '16px 0 0 0',
  borderTop: '1px solid #e6ebf1',
  paddingTop: '16px',
};
