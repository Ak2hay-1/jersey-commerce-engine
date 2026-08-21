const unsplash = (id: string, width = 1600): string =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const REPLACED_UNSPLASH_IDS: Record<string, string> = {
  'photo-1523398002811-dffb56d328e4': 'photo-1529139574466-a303027c1d8b',
  'photo-1618354691373-d851c5c3a999': 'photo-1581655353564-df123a1eb820',
  'photo-1461896836934-ffe607ba6851': 'photo-1546519638-68e109498ffc',
};

export const DEMO_HERO_IMAGE = unsplash('photo-1574629810360-7efbbe195018', 2400);
export const DEMO_CTA_IMAGE = unsplash('photo-1522778119026-d647f0596c20', 1800);
export const DEMO_STREET_IMAGE = unsplash('photo-1576566588028-4147f3842f27');
export const DEMO_KITS_IMAGE = unsplash('photo-1579952363873-27f3bade9f55');

const STREET = [
  unsplash('photo-1576566588028-4147f3842f27'),
  unsplash('photo-1521572163474-6864f9cf17ab'),
  unsplash('photo-1583743814966-8936f5b7be1a'),
  unsplash('photo-1581655353564-df123a1eb820'),
  unsplash('photo-1503342217505-b0a15ec3261c'),
  unsplash('photo-1622445275463-afa2ab738c34'),
  unsplash('photo-1556905055-8f358a7a47b2'),
  unsplash('photo-1552374196-1ab2a1c593e8'),
];

const KITS = [
  unsplash('photo-1579952363873-27f3bade9f55'),
  unsplash('photo-1431324155629-1a6deb1dec8d'),
  unsplash('photo-1522778119026-d647f0596c20'),
  unsplash('photo-1574629810360-7efbbe195018'),
  unsplash('photo-1517466787929-bc90951d0974'),
  unsplash('photo-1546519638-68e109498ffc'),
];

const NAMED: Record<string, string> = {
  '/demo/hero.jpg': DEMO_HERO_IMAGE,
  '/demo/cta.jpg': DEMO_CTA_IMAGE,
  '/demo/logo.png': DEMO_HERO_IMAGE,
  '/demo/favicon.png': DEMO_HERO_IMAGE,
};

function hash(value: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) >>> 0;
  }
  return total;
}

function isKitPath(src: string): boolean {
  return /jersey|football|cricket|ipl|sportswear|club|national|kids/i.test(src);
}

function rewriteDeadUnsplash(src: string): string {
  let next = src;
  for (const [dead, live] of Object.entries(REPLACED_UNSPLASH_IDS)) {
    if (next.includes(dead)) {
      next = next.replace(dead, live);
    }
  }
  return next;
}

export function resolveDemoMediaUrl(src?: string | null): string | undefined {
  if (!src) {
    return undefined;
  }
  const rewritten = rewriteDeadUnsplash(src);
  if (rewritten.startsWith('http://') || rewritten.startsWith('https://')) {
    return rewritten;
  }
  const named = NAMED[rewritten];
  if (named) {
    return named;
  }
  if (!rewritten.startsWith('/demo/')) {
    return rewritten;
  }
  const pool = isKitPath(rewritten) ? KITS : STREET;
  return pool[hash(rewritten) % pool.length];
}
