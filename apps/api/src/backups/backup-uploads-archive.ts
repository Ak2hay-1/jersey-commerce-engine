import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Archive the media uploads root into a gzipped tar at `outputPath`.
 * Empty or missing roots still produce a valid (near-empty) archive.
 */
export async function archiveUploadsRoot(uploadsRoot: string, outputPath: string): Promise<void> {
  const root = path.resolve(uploadsRoot);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  try {
    await fs.access(root);
  } catch {
    await fs.mkdir(root, { recursive: true });
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('tar', ['-czf', outputPath, '-C', root, '.'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const stderrChunks: Buffer[] = [];
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.on('error', (error) => {
      reject(new Error(`Failed to start tar (${error.message}).`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
      reject(new Error(`tar exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
    });
  });

  const stats = await fs.stat(outputPath);
  if (stats.size <= 0) {
    throw new Error('uploads archive is empty.');
  }
}
