import path from 'node:path';
import { BadRequestException } from '@nestjs/common';

const WINDOWS_DRIVE = /^[A-Za-z]:[\\/]/;
const WINDOWS_UNC = /^[\\/]{2}[^\\/]+/;

const BLOCKED_PREFIXES = [
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  '/etc',
  '/bin',
  '/sbin',
  '/usr',
  '/root',
  '/sys',
  '/proc',
  '/dev',
  '/boot',
  '/lib',
  '/lib64',
];

export function isAbsoluteBackupPath(value: string): boolean {
  return path.isAbsolute(value) || WINDOWS_DRIVE.test(value) || WINDOWS_UNC.test(value);
}

function matchesPrefix(candidate: string, prefix: string): boolean {
  const left = candidate.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const right = prefix.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  return left === right || left.startsWith(`${right}/`);
}

export function assertSafeBackupPath(input: string, allowedRoot = ''): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'Backup path is required when automatic backups are enabled.',
    });
  }
  if (trimmed.includes('\0') || trimmed.includes('..')) {
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'Backup path is not allowed.',
    });
  }
  if (!isAbsoluteBackupPath(trimmed)) {
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'Backup path must be an absolute folder on the machine running the API.',
    });
  }

  const normalized = path.normalize(trimmed);
  if (normalized.split(path.sep).includes('..')) {
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'Backup path is not allowed.',
    });
  }

  if (BLOCKED_PREFIXES.some((prefix) => matchesPrefix(normalized, prefix))) {
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: 'Backup path cannot be a system directory.',
    });
  }

  const root = allowedRoot.trim();
  if (root.length > 0) {
    const resolved = path.resolve(normalized);
    const resolvedRoot = path.resolve(path.normalize(root));
    if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Backup path must be inside ${resolvedRoot}.`,
      });
    }
  }

  return normalized;
}
