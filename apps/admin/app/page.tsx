import Link from 'next/link';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@jersey-commerce/ui';
import { publicEnv } from '../lib/env';

export default function HomePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Admin</CardTitle>
            <Badge variant="secondary">Foundation</Badge>
          </div>
          <CardDescription>
            Inventory, purchases, CRM, reports, and CMS remain later-phase work. Automatic backups
            can already be scheduled to a folder on the API server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">API: {publicEnv.NEXT_PUBLIC_API_URL}</p>
          <Button asChild>
            <Link href="/settings/backup">Configure automatic backups</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
