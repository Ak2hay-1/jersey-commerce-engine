'use client';

import { ResourceList } from '@/components/resource-list';
import { formatDateTime, statusLabel } from '@/lib/format';

interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  userRoles?: Array<{ role: { name: string; code: string } }>;
}

export default function UsersPage(): React.JSX.Element {
  return (
    <ResourceList<UserRow>
      title="Users & roles"
      path="/users"
      searchKey="search"
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
