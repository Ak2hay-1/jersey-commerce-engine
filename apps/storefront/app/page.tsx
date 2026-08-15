import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@jersey-commerce/ui';
import { publicEnv } from '../lib/env';

export default function HomePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Storefront</CardTitle>
            <Badge variant="secondary">Foundation</Badge>
          </div>
          <CardDescription>
            Customer commerce surface. Tenant branding, catalog, and checkout are not hardcoded and
            will be resolved per business in later phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">API: {publicEnv.NEXT_PUBLIC_API_URL}</p>
          <Button type="button" variant="outline" disabled>
            Storefront features belong to a later phase
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
