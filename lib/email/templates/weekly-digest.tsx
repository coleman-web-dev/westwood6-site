import { Text, Link, Section, Hr } from '@react-email/components';
import { EmailLayout } from './layout';

interface DigestInvoice {
  title: string;
  amount: number; // cents
  dueDate: string;
}

interface DigestAnnouncement {
  title: string;
  priority: string;
  date: string;
}

interface DigestEvent {
  title: string;
  date: string;
  location?: string;
}

interface WeeklyDigestProps {
  communityName: string;
  memberName: string;
  walletBalance: number; // cents
  unpaidInvoices: DigestInvoice[];
  recentAnnouncements: DigestAnnouncement[];
  upcomingEvents: DigestEvent[];
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function WeeklyDigestEmail({
  communityName,
  memberName,
  walletBalance,
  unpaidInvoices,
  recentAnnouncements,
  upcomingEvents,
  dashboardUrl,
  unsubscribeUrl,
}: WeeklyDigestProps) {
  const hasContent = unpaidInvoices.length > 0 || recentAnnouncements.length > 0 || upcomingEvents.length > 0;

  return (
    <EmailLayout
      preview={`Your weekly summary from ${communityName}`}
      communityName={communityName}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={headingStyle}>Weekly Summary</Text>
      <Text style={greetingStyle}>
        Hi {memberName}, here is your weekly update from {communityName}.
      </Text>

      {/* Wallet Balance */}
      <Section style={balanceBoxStyle}>
        <Text style={balanceLabelStyle}>Account Balance</Text>
        <Text style={balanceValueStyle}>
          ${(walletBalance / 100).toFixed(2)}
        </Text>
      </Section>

      {/* Unpaid Invoices */}
      {unpaidInvoices.length > 0 && (
        <>
          <Hr style={hrStyle} />
          <Text style={sectionHeadingStyle}>Outstanding Invoices</Text>
          {unpaidInvoices.map((inv, i) => (
            <Section key={i} style={listItemStyle}>
              <Text style={listTitleStyle}>{inv.title}</Text>
              <Text style={listMetaStyle}>
                ${(inv.amount / 100).toFixed(2)} &middot; Due{' '}
                {new Date(inv.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </Section>
          ))}
        </>
      )}

      {/* Announcements */}
      {recentAnnouncements.length > 0 && (
        <>
          <Hr style={hrStyle} />
          <Text style={sectionHeadingStyle}>Recent Announcements</Text>
          {recentAnnouncements.map((ann, i) => (
            <Section key={i} style={listItemStyle}>
              <Text style={listTitleStyle}>
                {ann.priority !== 'normal' && (
                  <span style={ann.priority === 'urgent' ? urgentBadge : importantBadge}>
                    {ann.priority.toUpperCase()}
                  </span>
                )}{' '}
                {ann.title}
              </Text>
              <Text style={listMetaStyle}>
                {new Date(ann.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </Section>
          ))}
        </>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <>
          <Hr style={hrStyle} />
          <Text style={sectionHeadingStyle}>Upcoming Events</Text>
          {upcomingEvents.map((evt, i) => (
            <Section key={i} style={listItemStyle}>
              <Text style={listTitleStyle}>{evt.title}</Text>
              <Text style={listMetaStyle}>
                {new Date(evt.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {evt.location ? ` · ${evt.location}` : ''}
              </Text>
            </Section>
          ))}
        </>
      )}

      {!hasContent && (
        <Text style={emptyStyle}>
          No new activity this week. Everything is up to date!
        </Text>
      )}

      {/* CTA */}
      <Hr style={hrStyle} />
      <Section style={ctaStyle}>
        <Link href={dashboardUrl} style={buttonStyle}>
          Open Dashboard
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

const greetingStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#525f7f',
  lineHeight: '22px',
  margin: '0 0 20px 0',
};

const balanceBoxStyle: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  borderRadius: '6px',
  padding: '16px 20px',
  textAlign: 'center' as const,
};

const balanceLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8898aa',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const balanceValueStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#16a34a',
  margin: '0',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1a1a2e',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px 0',
};

const listItemStyle: React.CSSProperties = {
  padding: '8px 0',
};

const listTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#32325d',
  fontWeight: '500',
  margin: '0',
};

const listMetaStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#8898aa',
  margin: '2px 0 0 0',
};

const urgentBadge: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  color: '#dc2626',
  fontSize: '10px',
  fontWeight: '700',
  padding: '1px 6px',
  borderRadius: '3px',
  letterSpacing: '0.5px',
};

const importantBadge: React.CSSProperties = {
  backgroundColor: '#fef3c7',
  color: '#d97706',
  fontSize: '10px',
  fontWeight: '700',
  padding: '1px 6px',
  borderRadius: '3px',
  letterSpacing: '0.5px',
};

const emptyStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#8898aa',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  margin: '20px 0',
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
