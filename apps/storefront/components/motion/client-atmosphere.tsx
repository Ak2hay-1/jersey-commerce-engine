'use client';

import dynamic from 'next/dynamic';

const CustomCursor = dynamic(
  () => import('./custom-cursor').then((mod) => mod.CustomCursor),
  { ssr: false },
);
const FilmGrain = dynamic(
  () => import('./film-grain').then((mod) => mod.FilmGrain),
  { ssr: false },
);

/** Client-only atmosphere effects that must not SSR. */
export function ClientAtmosphere(): React.JSX.Element {
  return (
    <>
      <CustomCursor />
      <FilmGrain />
    </>
  );
}
