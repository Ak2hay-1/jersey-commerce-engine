import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    initialScope: { tags: { surface: 'pos' } },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
