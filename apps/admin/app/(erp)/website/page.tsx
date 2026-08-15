'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

interface WebsiteSettings {
  contactPhone?: string | null;
  contactEmail?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export default function WebsitePage(): React.JSX.Element {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<WebsiteSettings>('/website/settings').then(setSettings).catch((err: Error) => setError(err.message));
  }, []);
  return (
    <div className="space-y-4">
      <PageHeader title="Website" description="Storefront settings for this tenant. CMS editing belongs to a later phase." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardHeader className="p-4"><CardTitle className="text-sm">Storefront</CardTitle></CardHeader>
        <CardContent className="space-y-1 p-4 pt-0 text-sm">
          <p>SEO title {settings?.seoTitle ?? '—'}</p>
          <p>SEO description {settings?.seoDescription ?? '—'}</p>
          <p>Phone {settings?.contactPhone ?? '—'}</p>
          <p>Email {settings?.contactEmail ?? '—'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
