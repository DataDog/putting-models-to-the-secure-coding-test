// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (env.SMTP_HOST) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      })
    );
  } else {
    transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
      nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      })
    );
  }

  return transporterPromise;
}

export async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!env.SMTP_HOST) {
    console.log(`\n[mail.service] SMTP not configured — password reset link for ${toEmail}:\n${resetUrl}\n`);
  }

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject: 'Reset your Document Portal password',
      text: `Reset your password using this link (valid for a limited time): ${resetUrl}`,
      html: `<p>Reset your password using this link (valid for a limited time):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    if (!env.SMTP_HOST) {
      console.log(`[mail.service] Ethereal preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (err) {
    console.error('[mail.service] Failed to send password reset email:', err.message);
  }
}
