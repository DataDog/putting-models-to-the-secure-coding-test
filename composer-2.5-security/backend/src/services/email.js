import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;

function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(email, resetUrl) {
  const subject = 'Reset your Document Portal password';
  const text = `You requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`;

  const transport = getTransporter();
  if (!transport) {
    console.log('\n--- Password Reset (dev mode) ---');
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('---------------------------------\n');
    return;
  }

  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    text,
  });
}
