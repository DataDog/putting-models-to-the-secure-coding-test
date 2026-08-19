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
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(email, resetUrl) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[dev] Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Reset your password — Document Portal',
    text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<p>Reset your password by clicking <a href="${resetUrl}">this link</a>.</p><p>This link expires in 1 hour.</p>`,
  });
}
