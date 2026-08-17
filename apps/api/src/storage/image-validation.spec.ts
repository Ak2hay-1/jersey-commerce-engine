import { sniffImageMime } from '../storage/image-validation';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);

describe('image validation', () => {
  it('sniffs PNG magic bytes and ignores the filename', () => {
    expect(sniffImageMime(PNG)).toBe('image/png');
  });

  it('rejects executable and empty payloads', () => {
    expect(sniffImageMime(Buffer.from('MZ'))).toBeNull();
    expect(sniffImageMime(Buffer.alloc(0))).toBeNull();
  });
});
