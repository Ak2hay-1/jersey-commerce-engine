import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { AuthSettings as AuthSettingsRecord } from '../../generated/prisma';

function toE164India(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  return digits;
}

@Injectable()
export class SmsSenderService {
  private readonly logger = new Logger(SmsSenderService.name);

  async send(settings: AuthSettingsRecord & { smsApiKey?: string; twilioAuthToken?: string }, input: {
    to: string;
    text: string;
  }): Promise<void> {
    if (settings.smsProvider === 'CONSOLE') {
      this.logger.log(`SMS to ${input.to}: ${input.text}`);
      return;
    }

    if (settings.smsProvider === 'MSG91') {
      if (!settings.smsApiKey || !settings.smsSenderId) {
        throw new ServiceUnavailableException('MSG91 is not configured.');
      }
      const mobile = toE164India(input.to);
      const url = new URL('https://control.msg91.com/api/sendhttp.php');
      url.searchParams.set('authkey', settings.smsApiKey);
      url.searchParams.set('mobiles', mobile);
      url.searchParams.set('message', input.text);
      url.searchParams.set('sender', settings.smsSenderId);
      url.searchParams.set('route', '4');
      url.searchParams.set('country', '91');
      const response = await fetch(url);
      if (!response.ok) {
        const detail = await response.text();
        this.logger.warn(`MSG91 failed: ${response.status} ${detail}`);
        throw new ServiceUnavailableException('Could not send SMS.');
      }
      return;
    }

    if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.smsFromNumber) {
      throw new ServiceUnavailableException('Twilio is not configured.');
    }
    const sid = settings.twilioAccountSid;
    const body = new URLSearchParams({
      From: settings.smsFromNumber,
      To: `+${toE164India(input.to)}`,
      Body: input.text,
    });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${settings.twilioAuthToken}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) {
      const detail = await response.text();
      this.logger.warn(`Twilio failed: ${response.status} ${detail}`);
      throw new ServiceUnavailableException('Could not send SMS.');
    }
  }
}
