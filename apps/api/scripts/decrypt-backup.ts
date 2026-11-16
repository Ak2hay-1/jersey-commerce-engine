/**
 * Decrypts a Jerzyfy backup.
 *
 * Legacy JSON snapshot:
 *   BACKUP_ENCRYPTION_KEY=... npm run backup:decrypt -w @jersey-commerce/api -- <input.json.gz.enc> [output.json]
 *
 * Full-app crash-recovery package:
 *   BACKUP_ENCRYPTION_KEY=... npm run backup:decrypt -w @jersey-commerce/api -- <input.app.tar.gz.enc> [output.app.tar.gz]
 *
 * For .json.gz.enc the output is gunzipped JSON. For .app.tar.gz.enc the output is the plain .app.tar.gz archive.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import {
  decryptBackup,
  decryptBackupFile,
  ENCRYPTED_APP_BACKUP_EXTENSION,
  ENCRYPTED_BACKUP_EXTENSION,
} from '../src/backups/backup-crypto';

async function main(): Promise<void> {
  const [input, outputArg] = process.argv.slice(2);
  const key = (process.env.BACKUP_ENCRYPTION_KEY ?? '').trim();
  if (!input) {
    console.error(
      'Usage: decrypt-backup <input.json.gz.enc|input.app.tar.gz.enc> [output path]',
    );
    process.exit(1);
  }
  if (!key) {
    console.error('Set BACKUP_ENCRYPTION_KEY in the environment.');
    process.exit(1);
  }

  if (input.endsWith(ENCRYPTED_APP_BACKUP_EXTENSION)) {
    const output =
      outputArg ?? input.slice(0, -ENCRYPTED_APP_BACKUP_EXTENSION.length) + '.app.tar.gz';
    if (output === input) {
      console.error('Refusing to overwrite the input file; pass an explicit output path.');
      process.exit(1);
    }
    await decryptBackupFile(input, output, key);
    console.log(`Decrypted full-app backup ${input} -> ${output}`);
    return;
  }

  const output = outputArg ?? input.replace(/\.gz\.enc$/, '').replace(/\.enc$/, '');
  if (output === input) {
    console.error('Refusing to overwrite the input file; pass an explicit output path.');
    process.exit(1);
  }
  if (!input.endsWith(ENCRYPTED_BACKUP_EXTENSION) && !input.endsWith('.enc')) {
    console.error(`Unrecognized encrypted backup extension on ${input}`);
    process.exit(1);
  }
  const json = gunzipSync(decryptBackup(readFileSync(input), key));
  writeFileSync(output, json, { mode: 0o600 });
  console.log(`Decrypted ${input} -> ${output} (${json.byteLength} bytes)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
