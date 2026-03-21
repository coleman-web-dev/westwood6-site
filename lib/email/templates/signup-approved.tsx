import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface SignupApprovedProps {
  communityName: string;
  firstName: string;
  loginUrl: string;
}

export function SignupApprovedEmail({
  communityName,
  firstName,
  loginUrl,
}: SignupApprovedProps) {
  return (
    <EmailLayout
      preview={`Your access to ${communityName} has been approved`}
      communityName={communityName}
    >
      <Text style={headingStyle}>You're in!</Text>
      <Text style={textStyle}>
        Hi {firstName},
      </Text>
      <Text style={textStyle}>
        Your request to join {communityName} on DuesIQ has been approved. You can
        now sign in with the email and password you used when you submitted your
        request.
      </Text>

      <Section style={ctaStyle}>
        <Link href={loginUrl} style={buttonStyle}>
          Sign In
        </Link>
      </Section>

      <Text style={textStyle}>
        Once signed in, you can view and pay assessments, reserve amenities, stay
        up to date with announcements, and more.
      </Text>

      <Text style={smallStyle}>
        If you did not request access, you can safely ignore this email.
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

const ctaStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  color: '#C4B08C',
  padding: '14px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: '600',
  display: 'inline-block',
};

const smallStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8898aa',
  margin: '24px 0 0 0',
};
