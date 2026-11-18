import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent,
  Boxes,
  CircleHelp,
  ClipboardList,
  FileBarChart2,
  Globe2,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Wallet,
} from 'lucide-react';

const BY_HREF: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/pos/': ShoppingBag,
  '/sales': Receipt,
  '/orders': ClipboardList,
  '/payments': Wallet,
  '/refunds': BadgePercent,
  '/products': Package,
  '/categories': Boxes,
  '/inventory': Warehouse,
  '/warehouses': Warehouse,
  '/inventory/movements': Boxes,
  '/inventory/low-stock': Boxes,
  '/suppliers': Truck,
  '/purchases': ShoppingCart,
  '/purchases/payments': Wallet,
  '/customers': Users,
  '/customers/segments': Users,
  '/custom-orders': ClipboardList,
  '/expenses': Wallet,
  '/reports': FileBarChart2,
  '/website': Globe2,
  '/promo-codes': BadgePercent,
  '/users': Users,
  '/settings': Settings,
};

export function navIconFor(href: string): LucideIcon {
  const path = href.split('?')[0] ?? href;
  if (BY_HREF[path]) {
    return BY_HREF[path];
  }
  if (path.startsWith('/reports')) {
    return FileBarChart2;
  }
  if (path.startsWith('/custom-orders')) {
    return ClipboardList;
  }
  if (path.startsWith('/inventory')) {
    return Warehouse;
  }
  if (path.startsWith('/settings')) {
    return Settings;
  }
  return CircleHelp;
}

export { CircleHelp };
