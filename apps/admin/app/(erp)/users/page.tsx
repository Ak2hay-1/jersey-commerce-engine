'use client';

import Link from 'next/link';
import { Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  userRoles?: Array<{ role: { name: string; code: string } }>;
}

export default function UsersPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<UserRow>
      title="Users & roles"
      description="Assign staff roles. Superior Admin is only visible to existing superior admins and is reserved for the developer and client."
      path="/users"
      searchKey="search"
      rowHref={(row) => `/users/${row.id}`}
      actions={
        auth.can('users.manage') ? (
          <Button asChild>
            <Link href="/users/new">Add user</Link>
          </Button>
        ) : null
      }
      columns={[
        { key: 'name', header: 'Name', render: (row) => row.name },
        { key: 'email', header: 'Email', render: (row) => row.email },
        { key: 'roles', header: 'Roles', hideOnMobile: true, render: (row) => (row.userRoles ?? []).map((item) => item.role.name).join(', ') || '—' },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.status) },
        { key: 'login', header: 'Last login', hideOnMobile: true, render: (row) => formatDateTime(row.lastLoginAt) },
      ]}
    />
  );
}
