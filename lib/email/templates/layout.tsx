import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  communityName: string;
  unsubscribeUrl?: string;
  children: React.ReactNode;
}

export function EmailLayout({
  preview,
  communityName,
  unsubscribeUrl,
  children,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={headerTextStyle}>{communityName}</Text>
            <Text style={subHeaderStyle}>Powered by DuesIQ</Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>{children}</Section>

          {/* Footer */}
          <Hr style={hrStyle} />
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              This email was sent by {communityName} via DuesIQ.
            </Text>
            {unsubscribeUrl && (
              <Text style={footerTextStyle}>
                <Link href={unsubscribeUrl} style={linkStyle}>
                  Unsubscribe from these emails
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

const containerStyle: React.CSSProperties = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const headerStyle: React.CSSProperties = {
  padding: '24px 32px',
  backgroundColor: '#1a1a2e',
  borderRadius: '8px 8px 0 0',
};

const headerTextStyle: React.CSSProperties = {
  color: '#C4B08C',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0',
};

const subHeaderStyle: React.CSSProperties = {
  color: '#8888a0',
  fontSize: '12px',
  margin: '4px 0 0 0',
};

const contentStyle: React.CSSProperties = {
  padding: '32px',
  backgroundColor: '#ffffff',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '0',
};

const footerStyle: React.CSSProperties = {
  padding: '24px 32px',
  backgroundColor: '#ffffff',
  borderRadius: '0 0 8px 8px',
};

const footerTextStyle: React.CSSProperties = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 4px 0',
};

const linkStyle: React.CSSProperties = {
  color: '#C4B08C',
  textDecoration: 'underline',
};
