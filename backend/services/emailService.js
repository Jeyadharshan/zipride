// backend/services/emailService.js
// Sends transactional emails using nodemailer (SMTP).
// Falls back to console logging if SMTP is not configured.

import { mailConfig } from '../config/mail.js';
import { Logger } from '../utils/logger.js';

let transporter = null;

const initTransporter = async () => {
  if (transporter) return transporter;

  if (!mailConfig.user || !mailConfig.pass) {
    Logger.info('[Email Service] SMTP not configured — emails will be console-logged only.');
    return null;
  }

  try {
    // Dynamically import nodemailer (add to package.json if needed)
    const nodemailer = await import('nodemailer');
    transporter = nodemailer.default.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: { user: mailConfig.user, pass: mailConfig.pass },
    });
    Logger.info('[Email Service] SMTP transporter initialised.');
    return transporter;
  } catch (err) {
    Logger.error('[Email Service] Failed to initialise nodemailer:', err.message);
    return null;
  }
};

export const EmailService = {
  async send(to, subject, html) {
    Logger.info(`[Email Service] Preparing email to ${to} — Subject: "${subject}"`);

    const transport = await initTransporter();

    if (!transport) {
      // Console fallback for development
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 [EMAIL DEV LOG]`);
      console.log(`To      : ${to}`);
      console.log(`Subject : ${subject}`);
      console.log(`Body    : [HTML email — see emailTemplates.js]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: true, mode: 'console' };
    }

    try {
      const info = await transport.sendMail({
        from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
        to,
        subject,
        html,
      });
      Logger.info(`[Email Service] Sent to ${to}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      Logger.error(`[Email Service] Send failed to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  async sendTemplate(to, template) {
    return this.send(to, template.subject, template.html);
  },
};

export default EmailService;
