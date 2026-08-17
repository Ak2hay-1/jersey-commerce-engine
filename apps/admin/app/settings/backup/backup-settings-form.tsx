'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@jersey-commerce/ui';
import type { BackupIntervalUnit, BackupRun, BackupSettings } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const INTERVAL_UNITS: { value: BackupIntervalUnit; label: string }[] = [
  { value: 'HOURS', label: 'Hours' },
  { value: 'DAYS', label: 'Days' },
  { value: 'WEEKS', label: 'Weeks' },
  { value: 'MONTHS', label: 'Months' },
];

const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not scheduled yet';
  }
  return new Date(value).toLocaleString();
}

function formatBytes(value: number | null): string {
  if (value == null) {
    return '—';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupSettingsForm(): React.JSX.Element {
  const auth = useAuth();
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  async function load(): Promise<void> {
    const [nextSettings, nextRuns] = await Promise.all([
      apiRequest<BackupSettings>('/backups/settings'),
      apiRequest<{ items: BackupRun[] }>(`/backups/runs${queryString({ page: 1, pageSize: 20 })}`),
    ]);
    setSettings(nextSettings);
    setRuns(nextRuns.items);
  }

  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      try {
        await load();
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load backup settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!settings) {
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await apiRequest<BackupSettings>('/backups/settings', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: settings.enabled,
          destinationPath: settings.destinationPath,
          scheduleTime: settings.scheduleTime,
          intervalValue: settings.intervalValue,
          intervalUnit: settings.intervalUnit,
          retainCopies: settings.retainCopies,
        }),
      });
      setSettings(saved);
      setNotice(
        saved.enabled
          ? `Automatic backups saved. Next run: ${formatDate(saved.nextRunAt)}.`
          : 'Automatic backups are turned off.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save backup settings.');
    } finally {
      setSaving(false);
    }
  }

  async function onRunNow(): Promise<void> {
    setRunning(true);
    setError('');
    setNotice('');
    try {
      const run = await apiRequest<BackupRun>('/backups/run', { method: 'POST' });
      setNotice(`Backup finished: ${run.filePath ?? run.fileName ?? 'complete'}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Backup failed.');
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading backup settings…</p>;
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automatic backups</CardTitle>
          <CardDescription>{error || 'Backup settings are not available for this tenant.'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void onSave(event)}>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Automatic backups</CardTitle>
            <Badge variant={settings.enabled ? 'default' : 'secondary'}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Save a tenant-scoped copy of store data to a folder on the machine that runs the API. Time of day uses{' '}
            {auth.tenant?.timezone ?? 'the tenant timezone'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
            />
            Enable automatic backups
          </label>

          <label className="block text-sm font-medium">
            Backup folder path
            <input
              className={fieldClass}
              required={settings.enabled}
              placeholder="C:\Backups\jersey-store"
              value={settings.destinationPath}
              onChange={(event) => setSettings({ ...settings, destinationPath: event.target.value })}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Absolute path on the API server, for example <code>C:\Backups\jersey-store</code> or{' '}
              <code>/var/backups/jersey-store</code>.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              When should backups run?
              <input
                className={fieldClass}
                type="time"
                required
                value={settings.scheduleTime}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    scheduleTime: event.target.value.slice(0, 5),
                  })
                }
              />
            </label>

            <div className="grid grid-cols-[1fr_1fr] gap-3">
              <label className="block text-sm font-medium">
                Repeat every
                <input
                  className={fieldClass}
                  type="number"
                  min={1}
                  max={365}
                  required
                  value={settings.intervalValue}
                  onChange={(event) =>
                    setSettings({ ...settings, intervalValue: Number(event.target.value) || 1 })
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Interval
                <select
                  className={fieldClass}
                  value={settings.intervalUnit}
                  onChange={(event) =>
                    setSettings({ ...settings, intervalUnit: event.target.value as BackupIntervalUnit })
                  }
                >
                  {INTERVAL_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <label className="block text-sm font-medium">
            Keep last
            <input
              className={`${fieldClass} max-w-[8rem]`}
              type="number"
              min={1}
              max={365}
              required
              value={settings.retainCopies}
              onChange={(event) => setSettings({ ...settings, retainCopies: Number(event.target.value) || 1 })}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Older backup files are deleted.</span>
          </label>

          <div className="grid gap-2 rounded-md border bg-muted/40 p-3 text-sm">
            <p>
              <span className="font-medium">Last run:</span> {formatDate(settings.lastRunAt)}
            </p>
            <p>
              <span className="font-medium">Next run:</span> {formatDate(settings.nextRunAt)}
            </p>
            {settings.lastError ? <p className="text-destructive">Last error: {settings.lastError}</p> : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || !auth.can('settings.manage')}>
            {saving ? 'Saving…' : 'Save backup schedule'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={running || !auth.can('settings.manage')}
            onClick={() => void onRunNow()}
          >
            {running ? 'Running…' : 'Run backup now'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent backups</CardTitle>
          <CardDescription>The latest copies written to the configured folder.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backups have been created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Trigger</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">File</th>
                    <th className="py-2 font-medium">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{formatDate(run.startedAt)}</td>
                      <td className="py-2 pr-3">{run.trigger === 'MANUAL' ? 'Manual' : 'Scheduled'}</td>
                      <td className="py-2 pr-3">{run.status}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{run.filePath ?? run.fileName ?? '—'}</td>
                      <td className="py-2">{formatBytes(run.fileSizeBytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
