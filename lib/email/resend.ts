import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEmailDirect({
  to,
  subject,
  html,
  from,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}) {
  const resend = getResendClient();
  const fromAddress = from || process.env.EMAIL_FROM_ADDRESS || 'DuesIQ <no-reply@duesiq.com>';

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
