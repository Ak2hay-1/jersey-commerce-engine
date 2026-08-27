export type OtpEmailInput = {
  storeName: string;
  code: string;
  expiresInMinutes: number;
  preview?: boolean;
};

export type OtpEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCode(code: string): string {
  const digits = code.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 3) {
    return digits;
  }
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

function normalizeStoreName(storeName: string): string {
  const trimmed = storeName.trim();
  return trimmed || 'Your store';
}

export function buildOtpEmail(input: OtpEmailInput): OtpEmailContent {
  const storeName = normalizeStoreName(input.storeName);
  const code = input.code.replace(/\D/g, '').slice(0, 6);
  const displayCode = formatCode(code);
  const minutes = Math.max(1, Math.round(input.expiresInMinutes));
  const safeStoreName = escapeHtml(storeName);
  const safeCode = escapeHtml(displayCode);
  const previewBanner = input.preview
    ? `<tr><td style="padding:0 32px 16px;"><p style="margin:0;padding:12px 16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;color:#92400e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;">This is a test message from Authentication settings. Delivery is working — real sign-in codes will look like this.</p></td></tr>`
    : '';

  const subject = input.preview ? `${storeName} — Test sign-in email` : `${storeName} — Your sign-in code`;

  const text = input.preview
    ? `This is a test message from ${storeName}. Email delivery is working.\n\nSample sign-in code: ${displayCode}\nExpires in ${minutes} minutes.\n\nIf you did not request this, you can ignore this email.`
    : `${storeName} sign-in code: ${displayCode}\n\nEnter this code on the sign-in page. It expires in ${minutes} minute${minutes === 1 ? '' : 's'}.\n\nIf you did not request this code, you can safely ignore this email. Someone else may have entered your email address by mistake.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;">${safeStoreName}</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:#18181b;">${input.preview ? 'Test sign-in email' : 'Your sign-in code'}</h1>
            </td>
          </tr>
          ${previewBanner}
          <tr>
            <td style="padding:8px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#52525b;">${input.preview ? 'Use the sample code below to preview how customer OTP emails will appear.' : 'Enter this code on the sign-in page to continue.'}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 24px;">
              <div style="display:inline-block;padding:18px 28px;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;">
                <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;color:#18181b;">${safeCode}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#52525b;">This code expires in <strong style="color:#18181b;">${minutes} minute${minutes === 1 ? '' : 's'}</strong>.</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">If you did not request this code, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#a1a1aa;">Sent by ${safeStoreName}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export function buildOtpSmsText(input: { storeName: string; code: string; expiresInMinutes: number }): string {
  const storeName = normalizeStoreName(input.storeName);
  const code = formatCode(input.code.replace(/\D/g, '').slice(0, 6));
  const minutes = Math.max(1, Math.round(input.expiresInMinutes));
  return `${storeName}: your sign-in code is ${code}. Expires in ${minutes} min.`;
}
