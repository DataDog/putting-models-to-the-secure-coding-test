// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

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

export async function sendPasswordResetEmail(toEmail, resetUrl) {
  const t = getTransporter();
  const subject = 'Reset your Document Portal password';
  const text = `We received a request to reset your password.\n\n` +
    `If you made this request, click the link below (it expires in ${config.passwordResetTtlMinutes} minutes):\n${resetUrl}\n\n` +
    `If you did not request this, you can safely ignore this email.`;

  if (!t) {
    // No SMTP configured (e.g. local dev) — log instead of sending so the
    // flow is still testable end-to-end.
    // eslint-disable-next-line no-console
    console.log(`[mailer] SMTP not configured. Password reset link for ${toEmail}:\n${resetUrl}`);
    return;
  }

  await t.sendMail({
    from: config.smtp.from,
    to: toEmail,
    subject,
    text,
  });
}
