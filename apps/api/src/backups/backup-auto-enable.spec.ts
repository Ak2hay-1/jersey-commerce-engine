import { shouldAutoEnableBackupSettings } from './backup-auto-enable';

describe('shouldAutoEnableBackupSettings', () => {
  it('enables when no settings row exists', () => {
    expect(shouldAutoEnableBackupSettings(null)).toBe(true);
  });

  it('enables when disabled with an empty destination (never configured)', () => {
    expect(shouldAutoEnableBackupSettings({ enabled: false, destinationPath: '' })).toBe(true);
    expect(shouldAutoEnableBackupSettings({ enabled: false, destinationPath: '   ' })).toBe(true);
  });

  it('skips when already enabled', () => {
    expect(shouldAutoEnableBackupSettings({ enabled: true, destinationPath: '/backups' })).toBe(false);
  });

  it('skips when staff saved a path and left backups off', () => {
    expect(shouldAutoEnableBackupSettings({ enabled: false, destinationPath: '/backups' })).toBe(false);
    expect(
      shouldAutoEnableBackupSettings({ enabled: false, destinationPath: 'C:\\Backups\\store' }),
    ).toBe(false);
  });
});
