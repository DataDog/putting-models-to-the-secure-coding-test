import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// Pluggable email transport. Only a console transport is implemented here
// (no SMTP credentials exist to hardcode or configure). A real transport
// (SES, SendGrid, SMTP, etc.) can be added later purely via env vars,
// without touching call sites below.
async function consoleTransport({ to, subject, text }) {
  logger.info({ to, subject }, 'Email (dev transport, not actually sent)');
  // eslint-disable-next-line no-console
  console.log(`\n--- DEV EMAIL ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-----------------\n`);
}

export async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${env.frontendOrigin}/reset-password?token=${resetToken}`;
  await consoleTransport({
    to: user.email,
    subject: 'Reset your Document Portal password',
    text: `Someone requested a password reset for this account. If this was you, use the link below within 1 hour:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
  });
}
