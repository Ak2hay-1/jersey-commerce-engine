/**
 * Decrypts a Jerzyfy backup (.json.gz.enc) into plain JSON.
 *
 * Usage:
 *   BACKUP_ENCRYPTION_KEY=... npm run backup:decrypt -w @jersey-commerce/api -- <input.json.gz.enc> [output.json]
 *
 * Output defaults to the input path with the .gz.enc suffix removed. The output contains
 * customer personal data; store it securely and delete it after the restore.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { decryptBackup } from '../src/backups/backup-crypto';

function main(): void {
  const [input, outputArg] = process.argv.slice(2);
  const key = (process.env.BACKUP_ENCRYPTION_KEY ?? '').trim();
  if (!input) {
    console.error('Usage: decrypt-backup <input.json.gz.enc> [output.json]');
    process.exit(1);
  }
  if (!key) {
    console.error('Set BACKUP_ENCRYPTION_KEY in the environment.');
    process.exit(1);
  }
  const output = outputArg ?? input.replace(/\.gz\.enc$/, '').replace(/\.enc$/, '');
  if (output === input) {
    console.error('Refusing to overwrite the input file; pass an explicit output path.');
    process.exit(1);
  }
  const json = gunzipSync(decryptBackup(readFileSync(input), key));
  writeFileSync(output, json, { mode: 0o600 });
  console.log(`Decrypted ${input} -> ${output} (${json.byteLength} bytes)`);
}

main();
