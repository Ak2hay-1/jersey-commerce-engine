import QRCode from 'qrcode';
import { formatMoney } from '@/lib/format';

export type QrLabelItem = {
  sku: string;
  productName: string;
  size?: string | null;
  colour?: string | null;
  sellingPrice: string;
};

function variantLine(item: QrLabelItem): string {
  return [item.size, item.colour].filter(Boolean).join(' · ') || '—';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Build a printable sheet of QR labels encoding each variant SKU. */
export async function printQrLabels(items: QrLabelItem[]): Promise<void> {
  const labels = items.filter((item) => item.sku.trim());
  if (!labels.length) {
    throw new Error('No variants with SKUs to print.');
  }

  const cards = await Promise.all(
    labels.map(async (item) => {
      const dataUrl = await QRCode.toDataURL(item.sku.trim(), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180,
        color: { dark: '#111111', light: '#ffffff' },
      });
      return `
        <article class="label">
          <img src="${dataUrl}" alt="QR for ${escapeHtml(item.sku)}" width="120" height="120" />
          <div class="meta">
            <p class="name">${escapeHtml(item.productName)}</p>
            <p class="size">${escapeHtml(variantLine(item))}</p>
            <p class="sku">${escapeHtml(item.sku)}</p>
            <p class="price">${escapeHtml(formatMoney(item.sellingPrice))}</p>
          </div>
        </article>
      `;
    }),
  );

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Jerzyfy QR labels</title>
  <style>
    @page { margin: 10mm; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #111; margin: 0; }
    h1 { font-size: 14px; margin: 0 0 12px; }
    .sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .label {
      display: flex; gap: 10px; align-items: center;
      border: 1px solid #d4d4d4; border-radius: 8px; padding: 10px;
      break-inside: avoid; page-break-inside: avoid;
    }
    .meta { min-width: 0; }
    .name { font-size: 13px; font-weight: 650; margin: 0 0 4px; line-height: 1.25; }
    .size, .sku, .price { margin: 0; font-size: 12px; line-height: 1.35; }
    .sku { font-family: ui-monospace, Consolas, monospace; color: #444; }
    .price { font-weight: 650; margin-top: 4px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1 { display: none; }
    }
  </style>
</head>
<body>
  <h1>Jerzyfy QR labels · ${labels.length}</h1>
  <div class="sheet">${cards.join('')}</div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

  const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!popup) {
    throw new Error('Pop-up blocked. Allow pop-ups for this site to print labels.');
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
