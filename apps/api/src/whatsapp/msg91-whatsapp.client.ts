import { Injectable } from '@nestjs/common';

export const MSG91_WHATSAPP_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

export function toWhatsappIndia(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export type Msg91ReceiptTemplateInput = {
  integratedNumber: string;
  templateName: string;
  namespace: string | null;
  language: string;
  to: string;
  documentUrl: string;
  documentFilename: string;
  customerName: string;
  billNumber: string;
  total: string;
};

export function buildMsg91ReceiptPayload(input: Msg91ReceiptTemplateInput): Record<string, unknown> {
  const template: Record<string, unknown> = {
    name: input.templateName,
    language: { code: input.language || 'en', policy: 'deterministic' },
    to_and_components: [
      {
        to: [input.to],
        components: {
          header_1: { type: 'document', value: input.documentUrl, filename: input.documentFilename },
          body_1: { type: 'text', value: input.customerName },
          body_2: { type: 'text', value: input.billNumber },
          body_3: { type: 'text', value: input.total },
        },
      },
    ],
  };
  if (input.namespace) {
    template.namespace = input.namespace;
  }
  return {
    integrated_number: input.integratedNumber,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template,
    },
  };
}

export type Msg91SendResult = { ok: boolean; providerRef: string | null; message: string; raw: unknown };

@Injectable()
export class Msg91WhatsappClient {
  async sendReceiptTemplate(authKey: string, input: Msg91ReceiptTemplateInput): Promise<Msg91SendResult> {
    const response = await fetch(MSG91_WHATSAPP_URL, {
      method: 'POST',
      headers: {
        authkey: authKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(buildMsg91ReceiptPayload(input)),
    });
    const text = await response.text();
    let raw: unknown = text;
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      /* keep text */
    }
    const record = (raw && typeof raw === 'object' ? raw : {}) as {
      status?: string;
      type?: string;
      hasError?: boolean;
      errors?: unknown;
      message?: unknown;
      data?: unknown;
      request_id?: string;
    };
    const failed =
      !response.ok ||
      record.hasError === true ||
      record.status === 'fail' ||
      record.type === 'error' ||
      (record.errors !== undefined && record.errors !== null && record.errors !== '');
    const providerRef =
      record.request_id ??
      (typeof record.data === 'string' ? record.data : null) ??
      ((record.data as { request_id?: string } | undefined)?.request_id ?? null);
    const detail = [record.errors, record.message]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
      .join('; ');
    return {
      ok: !failed,
      providerRef,
      message: failed ? detail || `MSG91 HTTP ${response.status}` : 'Sent',
      raw,
    };
  }
}
