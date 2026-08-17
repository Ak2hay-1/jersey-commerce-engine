import { BadRequestException } from '@nestjs/common';
import { assertSafeBackupPath, isAbsoluteBackupPath } from './backup-path';

describe('backup path', () => {
  const absolute = process.platform === 'win32' ? 'C:\\Backups\\jersey-store' : '/var/backups/jersey-store';

  it('accepts an absolute folder path', () => {
    expect(assertSafeBackupPath(absolute)).toBeTruthy();
    expect(isAbsoluteBackupPath(absolute)).toBe(true);
  });

  it('accepts a Windows drive path even on POSIX', () => {
    expect(isAbsoluteBackupPath('D:\\JerseyBackups')).toBe(true);
  });

  it('rejects a relative path', () => {
    expect(() => assertSafeBackupPath('backups\\jersey')).toThrow(BadRequestException);
  });

  it('rejects parent-directory traversal', () => {
    expect(() => assertSafeBackupPath(`${absolute}\\..\\secrets`)).toThrow(BadRequestException);
  });

  it('rejects system directories', () => {
    expect(() => assertSafeBackupPath('/etc/jersey-backups')).toThrow(BadRequestException);
    expect(() => assertSafeBackupPath('C:\\Windows\\Temp')).toThrow(BadRequestException);
  });

  it('requires the path to stay inside an allowed root', () => {
    expect(() => assertSafeBackupPath(absolute, process.platform === 'win32' ? 'D:\\Other' : '/opt/only')).toThrow(
      BadRequestException,
    );
    expect(assertSafeBackupPath(absolute, absolute)).toBeTruthy();
  });
});
