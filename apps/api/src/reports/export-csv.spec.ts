import { csvEscape, toCsv } from './export-csv';

describe('CSV export', () => {
  it('escapes quotes and commas and preserves filter columns', () => {
    expect(csvEscape('India, Jersey')).toBe('"India, Jersey"');
    expect(csvEscape('He said "hi"')).toBe('"He said ""hi"""');
    const csv = toCsv(
      [
        { key: 'invoice', header: 'Invoice', value: (row) => row.invoice },
        { key: 'amount', header: 'Amount', value: (row) => row.amount },
      ],
      [{ invoice: 'INV-1', amount: '899.00' }],
    );
    expect(csv).toBe('Invoice,Amount\r\nINV-1,899.00');
  });
});
