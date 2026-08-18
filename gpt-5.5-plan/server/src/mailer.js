// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import nodemailer from "nodemailer";
import { config } from "./config.js";

function hasSmtpConfig() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!hasSmtpConfig()) {
    console.info(`Password reset URL for ${to}: ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject: "Reset your Document Portal password",
    text: `Use this link to reset your password: ${resetUrl}`
  });
}
