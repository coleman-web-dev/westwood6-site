import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface WelcomeInviteProps {
  communityName: string;
  memberName: string;
  signupUrl: string;
}

export function WelcomeInviteEmail({
  communityName,
  memberName,
  signupUrl,
}: WelcomeInviteProps) {
  return (
    <EmailLayout
      preview={`You've been invited to ${communityName} on DuesIQ`}
      communityName={communityName}
    >
      <Text style={headingStyle}>Welcome to {communityName}!</Text>
      <Text style={textStyle}>
        Hi {memberName},
      </Text>
      <Text style={textStyle}>
        Your community has set up DuesIQ, a portal where you can view and pay
        assessments, reserve amenities, stay up to date with announcements, and more.
      </Text>
      <Text style={textStyle}>
        Click the button below to create your account and get started.
      </Text>

      <Section style={ctaStyle}>
        <Link href={signupUrl} style={buttonStyle}>
          Create Your Account
        </Link>
      </Section>

      <Text style={smallStyle}>
        If you did not expect this email, you can safely ignore it.
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
