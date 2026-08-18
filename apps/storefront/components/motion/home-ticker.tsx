'use client';

import { useStore } from '../providers/store-provider';
import { Ticker } from './ticker';

export function HomeTicker(): React.JSX.Element {
  const store = useStore();
  const items = [store.tenant.name, 'Premium jerseys', 'Custom kits', 'Match day', ...store.navigation.map((item) => item.name)];
  return <Ticker items={items} />;
}
