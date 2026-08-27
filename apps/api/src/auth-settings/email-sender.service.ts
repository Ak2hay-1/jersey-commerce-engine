import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { AuthSettings as AuthSettingsRecord } from '../../generated/prisma';

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  async send(settings: AuthSettingsRecord & { resendApiKey?: string; smtpPassword?: string }, input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    const fromName = settings.emailFromName?.trim() || 'Store';
    const fromAddress = settings.emailFromAddress?.trim() || 'noreply@localhost';
    const from = `${fromName} <${fromAddress}>`;

    if (settings.emailProvider === 'CONSOLE') {
      this.logger.log(`Email to ${input.to}: ${input.subject} — ${input.text}`);
      return;
    }

    if (settings.emailProvider === 'RESEND') {
      if (!settings.resendApiKey) {
        throw new ServiceUnavailableException('Resend API key is not configured.');
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${settings.resendApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          ...(input.html ? { html: input.html } : {}),
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        this.logger.warn(`Resend failed: ${response.status} ${detail}`);
        throw new ServiceUnavailableException('Could not send email.');
      }
      return;
    }

    await this.sendSmtp(settings, { fromAddress, fromName, ...input });
  }

  private async sendSmtp(
    settings: AuthSettingsRecord & { smtpPassword?: string },
    input: { fromAddress: string; fromName: string; to: string; subject: string; text: string; html?: string },
  ): Promise<void> {
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      throw new ServiceUnavailableException('SMTP is not configured.');
    }
    const transport = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort ?? 587,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser, pass: settings.smtpPassword },
    });
    await transport.sendMail({
      from: `"${input.fromName}" <${input.fromAddress}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });
  }
}
