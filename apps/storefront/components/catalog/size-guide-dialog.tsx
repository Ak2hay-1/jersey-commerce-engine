'use client';

import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@jersey-commerce/ui';
import { DEFAULT_STOREFRONT_GUIDES, type StorefrontGuidesConfig } from '@jersey-commerce/types';
import { useStore } from '../providers/store-provider';

export function SizeGuideBody({ guides }: { guides: StorefrontGuidesConfig }): React.JSX.Element {
  return (
    <div className="space-y-4">
      <p>{guides.sizeChartIntro}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
          <caption className="sr-only">Jersey size chart in centimetres</caption>
          <thead>
            <tr className="border-b border-white/15 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Size
              </th>
              <th scope="col" className="py-2 pr-3 font-semibold">
                Chest (cm)
              </th>
              <th scope="col" className="py-2 font-semibold">
                Length (cm)
              </th>
            </tr>
          </thead>
          <tbody>
            {guides.sizeChartRows.map((row) => (
              <tr key={row.size} className="border-b border-white/10">
                <th scope="row" className="py-2.5 pr-3 font-semibold text-foreground">
                  {row.size}
                </th>
                <td className="tabular py-2.5 pr-3">{row.chest}</td>
                <td className="tabular py-2.5">{row.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {guides.sizeChartNote ? <p className="text-xs text-muted-foreground">{guides.sizeChartNote}</p> : null}
    </div>
  );
}

export function SizeGuideDialog({ trigger }: { trigger: ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const store = useStore();
  const guides = store.website.chrome?.guides ?? DEFAULT_STOREFRONT_GUIDES;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md border-white/10 bg-[hsl(var(--surface-1))] text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase tracking-wide">Size guide</DialogTitle>
          <DialogDescription className="sr-only">Jersey chest and length measurements in centimetres.</DialogDescription>
        </DialogHeader>
        <SizeGuideBody guides={guides} />
      </DialogContent>
    </Dialog>
  );
}
