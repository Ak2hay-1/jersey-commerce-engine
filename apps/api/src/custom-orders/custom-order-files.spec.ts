import { customOrderStorageKey, sanitizeOriginalFilename, sniffCustomOrderMime, validateCustomOrderFile } from './custom-order-files';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = Buffer.from('%PDF-1.4 mock');

describe('custom order file security', () => {
  it('accepts sniffed PNG and PDF files and ignores unsafe client names', () => {
    const png = validateCustomOrderFile({
      buffer: PNG,
      size: PNG.length,
      originalname: '../../etc/passwd.png',
      mimetype: 'image/png',
    });
    expect(png.mimeType).toBe('image/png');
    expect(png.originalFilename).not.toContain('..');
    expect(png.storageName.endsWith('.png')).toBe(true);

    const pdf = validateCustomOrderFile({
      buffer: PDF,
      size: PDF.length,
      originalname: 'kit.pdf',
      mimetype: 'application/pdf',
    });
    expect(pdf.mimeType).toBe('application/pdf');
  });

  it('rejects executables, mismatched MIME, and oversized files', () => {
    expect(() =>
      validateCustomOrderFile({ buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]), size: 4, originalname: 'virus.exe', mimetype: 'application/octet-stream' }),
    ).toThrow('Executable files are not allowed.');
    expect(() =>
      validateCustomOrderFile({ buffer: Buffer.from('hello'), size: 5, originalname: 'note.txt', mimetype: 'text/plain' }),
    ).toThrow('Only PNG, JPG, JPEG, WEBP, and PDF files are allowed.');
    expect(() =>
      validateCustomOrderFile({ buffer: PNG, size: PNG.length, originalname: 'kit.pdf', mimetype: 'application/pdf' }),
    ).toThrow('File extension does not match the file contents.');
    expect(() =>
      validateCustomOrderFile({ buffer: PNG, size: 9 * 1024 * 1024, originalname: 'huge.png', mimetype: 'image/png' }),
    ).toThrow('8MB');
  });

  it('builds tenant-safe storage keys and sanitizes filenames', () => {
    expect(sanitizeOriginalFilename('..\\windows\\system32\\kit.png')).toBe('kit.png');
    expect(customOrderStorageKey('tenantA', 'order1', 'abc.png')).toBe('tenantA/custom-orders/order1/abc.png');
    expect(() => customOrderStorageKey('t', 'o', '../abc.png')).toThrow('Invalid storage path.');
  });

  it('sniffs PDF magic bytes', () => {
    expect(sniffCustomOrderMime(PDF)).toBe('application/pdf');
    expect(sniffCustomOrderMime(Buffer.from('MZ'))).toBeNull();
  });
});
