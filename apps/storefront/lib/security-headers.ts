type Header = { key: string; value: string };

function origin(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function list(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((value) => origin(value.trim()))
    .filter((value): value is string => Boolean(value));
}

/** Origins allowed to embed the storefront (Admin → Website customizer preview). */
export function frameAncestorOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = list(env.NEXT_PUBLIC_CUSTOMIZER_PARENT_ORIGINS || env.NEXT_PUBLIC_ADMIN_URL);
  if (configured.length > 0) {
    return configured;
  }
  return ['https://admin.jerzyfy.in', 'http://localhost:3001', 'http://127.0.0.1:3001'];
}

export function buildContentSecurityPolicy(env: NodeJS.ProcessEnv = process.env): string {
  const isDev = env.NODE_ENV !== 'production';
  const api = origin(env.NEXT_PUBLIC_API_URL);
  const sentry = origin(env.NEXT_PUBLIC_SENTRY_DSN);
  const razorpay = 'https://*.razorpay.com';
  const extra = (values: Array<string | null>) => values.filter(Boolean).join(' ');

  const directives: Record<string, string> = {
    'default-src': "'self'",
    // Next.js App Router hydration uses inline scripts; nonces would force dynamic rendering.
    'script-src': `'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ''}https://checkout.razorpay.com ${razorpay}`,
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: blob: https:" + (api?.startsWith('http:') ? ` ${api}` : ''),
    'media-src': `'self' blob: ${extra([api])}`.trim(),
    'font-src': "'self' data:",
    'connect-src': `'self' ${extra([api, sentry, razorpay])}${isDev ? ' ws: http://localhost:4000' : ''}`.trim(),
    'frame-src': `'self' ${razorpay}`,
    'frame-ancestors': `'self' ${frameAncestorOrigins(env).join(' ')}`,
    'form-action': `'self' ${razorpay}`,
    'base-uri': "'self'",
    'object-src': "'none'",
  };

  return Object.entries(directives)
    .map(([name, value]) => `${name} ${value}`)
    .join('; ');
}

export function storefrontSecurityHeaders(env: NodeJS.ProcessEnv = process.env): Header[] {
  const cspHeader =
    env.CSP_REPORT_ONLY === 'true' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  return [
    { key: cspHeader, value: buildContentSecurityPolicy(env) },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://api.razorpay.com")',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ];
}
