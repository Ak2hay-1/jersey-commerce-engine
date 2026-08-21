'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { RoleCode } from '@jersey-commerce/types';
import { apiRequest } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';
import { statusLabel } from '@/lib/format';

interface RoleRow {
  id: string;
  code: RoleCode;
  name: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  mustChangePassword?: boolean;
  userRoles?: Array<{ role: { name: string; code: RoleCode } }>;
}

export default function UserDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const canManage = auth.can('users.manage');
  const isSuperior = auth.user?.roles.includes('SUPER_ADMIN') ?? false;
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleCode[]>([]);
  const [assignCode, setAssignCode] = useState<RoleCode | ''>('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void apiRequest<{ items: RoleRow[] }>('/roles?pageSize=50').then((result) => setRoles(result.items));
    if (!isNew) {
      apiRequest<UserDetail>(`/users/${params.id}`)
        .then((row) => {
          setUser(row);
          setName(row.name);
          setEmail(row.email);
          setPhone(row.phone ?? '');
        })
        .catch((err: Error) => setError(err.message));
    }
  }, [isNew, params.id]);

  const assignedCodes = useMemo(
    () => (user?.userRoles ?? []).map((item) => item.role.code),
    [user],
  );
  const assignable = roles.filter((role) => !assignedCodes.includes(role.code));

  function toggleRole(code: RoleCode): void {
    setSelectedRoles((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  async function reloadUser(): Promise<void> {
    const row = await apiRequest<UserDetail>(`/users/${params.id}`);
    setUser(row);
    setName(row.name);
    setEmail(row.email);
    setPhone(row.phone ?? '');
  }

  async function onCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (selectedRoles.length === 0) {
      setError('Select at least one role.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest<{ id: string }>('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone: phone || undefined, password, roleCodes: selectedRoles }),
      });
      router.replace(`/users/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create user');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveProfile(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/users/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, email, phone: phone || undefined }),
      });
      await reloadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save user');
    } finally {
      setSaving(false);
    }
  }

  async function onAssign(): Promise<void> {
    if (!assignCode) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/users/${params.id}/roles`, { method: 'POST', body: JSON.stringify({ roleCode: assignCode }) });
      setAssignCode('');
      await reloadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign role');
    } finally {
      setSaving(false);
    }
  }

  async function onRemoveRole(code: RoleCode): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/users/${params.id}/roles/${code}`, { method: 'DELETE' });
      await reloadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove role');
    } finally {
      setSaving(false);
    }
  }

  async function onSetTemporaryPassword(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/users/${params.id}/temporary-password`, {
        method: 'POST',
        body: JSON.stringify({ password: temporaryPassword }),
      });
      setTemporaryPassword('');
      await reloadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to set temporary password');
    } finally {
      setSaving(false);
    }
  }

  async function onSetActive(active: boolean): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/users/${params.id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' });
      await reloadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={isNew ? 'Add staff user' : user?.name ?? 'User'}
        description={
          isNew
            ? 'Assign one or more roles. Superior Admin is reserved for the developer and client accounts.'
            : user?.email
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isNew ? (
        <Card>
          <CardContent className="p-4">
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onCreate(event)}>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" className="mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" className="mt-1" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" className="mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" type="password" className="mt-1" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <p className="mt-1 text-xs text-muted-foreground">
                  They must change this password on first sign-in. Use at least 8 characters with uppercase, lowercase, a
                  number, and a special character.
                </p>
              </div>
              <fieldset className="md:col-span-2 space-y-2">
                <legend className="text-sm font-medium">Roles</legend>
                <div className="grid gap-2 md:grid-cols-2">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                      <input type="checkbox" checked={selectedRoles.includes(role.code)} onChange={() => toggleRole(role.code)} />
                      <span>
                        {role.name}
                        {role.code === 'SUPER_ADMIN' ? ' — full website and ERP access' : ''}
                      </span>
                    </label>
                  ))}
                </div>
                {!isSuperior ? (
                  <p className="text-xs text-muted-foreground">Superior Admin is hidden unless you already have that role.</p>
                ) : null}
              </fieldset>
              {canManage ? (
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create user'}
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSaveProfile(event)}>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" className="mt-1" value={name} disabled={!canManage} onChange={(event) => setName(event.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" className="mt-1" value={email} disabled={!canManage} onChange={(event) => setEmail(event.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" className="mt-1" value={phone} disabled={!canManage} onChange={(event) => setPhone(event.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  {user ? <Badge variant={user.status === 'ACTIVE' ? 'secondary' : 'outline'}>{statusLabel(user.status)}</Badge> : null}
                  {user?.mustChangePassword ? <Badge variant="outline">Must change password</Badge> : null}
                  {canManage ? (
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving…' : 'Save profile'}
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Assigned roles</p>
              <ul className="space-y-2">
                {(user?.userRoles ?? []).map((item) => (
                  <li key={item.role.code} className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm">
                    <span>
                      {item.role.name}
                      {item.role.code === 'SUPER_ADMIN' ? ' — full access' : ''}
                    </span>
                    {canManage ? (
                      <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void onRemoveRole(item.role.code)}>
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {canManage && assignable.length > 0 ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem] flex-1">
                    <Label htmlFor="assign">Add a role</Label>
                    <select
                      id="assign"
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={assignCode}
                      onChange={(event) => setAssignCode(event.target.value as RoleCode | '')}
                    >
                      <option value="">Select</option>
                      {assignable.map((role) => (
                        <option key={role.id} value={role.code}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" variant="outline" disabled={!assignCode || saving} onClick={() => void onAssign()}>
                    Assign
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {canManage && user && user.id !== auth.user?.id ? (
            <Card>
              <CardContent className="p-4">
                <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSetTemporaryPassword(event)}>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium">Set temporary password</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Signs them out of other devices. They must choose a new password on next sign-in.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="temporary-password">Temporary password</Label>
                    <Input
                      id="temporary-password"
                      type="password"
                      className="mt-1"
                      value={temporaryPassword}
                      onChange={(event) => setTemporaryPassword(event.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="outline" disabled={saving || temporaryPassword.length === 0}>
                      {saving ? 'Saving…' : 'Set temporary password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {canManage && user && user.id !== auth.user?.id ? (
            <div>
              {user.status === 'ACTIVE' ? (
                <Button type="button" variant="destructive" disabled={saving} onClick={() => void onSetActive(false)}>
                  Deactivate
                </Button>
              ) : (
                <Button type="button" disabled={saving} onClick={() => void onSetActive(true)}>
                  Activate
                </Button>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
