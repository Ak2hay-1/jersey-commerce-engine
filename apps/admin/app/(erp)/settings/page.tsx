'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@jersey-commerce/ui';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';

export default function SettingsPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Tenant workspace configuration." />
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="p-4"><CardTitle className="text-sm">Business</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-sm">
            <p>{auth.tenant?.name}</p>
            <p className="text-muted-foreground">{auth.tenant?.slug}</p>
            <p>Timezone {auth.tenant?.timezone}</p>
            <p>Currency {auth.tenant?.currency}</p>
          </CardContent>
        </Card>
        {auth.can('settings.read') || auth.can('settings.manage') ? (
          <Link href="/settings/backup">
            <Card className="h-full hover:bg-muted/40">
              <CardHeader className="p-4"><CardTitle className="text-sm">Automatic backups</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0 text-sm text-muted-foreground">Schedule folder backups on the API server.</CardContent>
            </Card>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
