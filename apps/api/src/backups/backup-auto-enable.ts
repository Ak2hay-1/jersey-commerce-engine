/** Destination used when R2 is configured and backups have never been set up. */
export const AUTO_ENABLE_BACKUP_PATH = '/backups';

/**
 * Auto-enable only when settings are missing, or never configured
 * (disabled with an empty destination). Staff who saved a path and turned
 * backups off are left alone.
 */
export function shouldAutoEnableBackupSettings(
  existing: { enabled: boolean; destinationPath: string } | null,
): boolean {
  if (!existing) {
    return true;
  }
  return !existing.enabled && existing.destinationPath.trim().length === 0;
}
