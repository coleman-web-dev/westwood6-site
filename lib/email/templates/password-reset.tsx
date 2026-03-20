import { Text, Link, Section } from '@react-email/components';
import { EmailLayout } from './layout';

interface PasswordResetProps {
  communityName: string;
  resetUrl: string;
}

export function PasswordResetEmail({
  communityName,
  resetUrl,
}: PasswordResetProps) {
  return (
    <EmailLayout
      preview="Reset your password"
      communityName={communityName}
    >
      <Text style={headingStyle}>Reset Your Password</Text>
      <Text style={textStyle}>
        We received a request to reset the password for your account. Click the
        button below to choose a new password.
      </Text>

      <Section style={ctaStyle}>
        <Link href={resetUrl} style={buttonStyle}>
          Reset Password
        </Link>
      </Section>

      <Text style={textStyle}>
        This link will expire in 1 hour. If you did not request a password
        reset, you can safely ignore this email.
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
