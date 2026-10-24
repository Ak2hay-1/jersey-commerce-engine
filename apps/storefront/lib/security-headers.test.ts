import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, frameAncestorOrigins, storefrontSecurityHeaders } from './security-headers';

const prodEnv = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_API_URL: 'https://api.jerzyfy.in',
  NEXT_PUBLIC_ADMIN_URL: 'https://admin.jerzyfy.in/',
} as unknown as NodeJS.ProcessEnv;

describe('storefront security headers', () => {
  it('builds a production CSP without unsafe-eval that allows Razorpay and the API', () => {
    const csp = buildContentSecurityPolicy(prodEnv);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain('https://checkout.razorpay.com');
    expect(csp).toMatch(/connect-src 'self' https:\/\/api\.jerzyfy\.in/);
    expect(csp).toContain("frame-ancestors 'self' https://admin.jerzyfy.in");
    expect(csp).not.toContain('localhost:3001');
    expect(csp).not.toContain('127.0.0.1:3001');
    expect(csp).toContain('https://static.cloudflareinsights.com');
    expect(csp).toContain('https://cloudflareinsights.com');
    expect(csp).toContain("object-src 'none'");
  });

  it('omits localhost frame ancestors in production when no admin origin is configured', () => {
    const origins = frameAncestorOrigins({ NODE_ENV: 'production' } as never);
    expect(origins).toEqual(['https://admin.jerzyfy.in']);
  });

  it('keeps localhost frame ancestors for local customizer preview', () => {
    const origins = frameAncestorOrigins({ NODE_ENV: 'development' } as never);
    expect(origins).toEqual(['https://admin.jerzyfy.in', 'http://localhost:3001', 'http://127.0.0.1:3001']);
  });

  it('uses configured customizer parent origins when present', () => {
    expect(
      frameAncestorOrigins({ NEXT_PUBLIC_CUSTOMIZER_PARENT_ORIGINS: 'https://a.example, https://b.example' } as never),
    ).toEqual(['https://a.example', 'https://b.example']);
  });

  it('switches to report-only when CSP_REPORT_ONLY=true', () => {
    const headers = storefrontSecurityHeaders({ ...prodEnv, CSP_REPORT_ONLY: 'true' } as never);
    expect(headers.map((header) => header.key)).toContain('Content-Security-Policy-Report-Only');
    expect(headers.map((header) => header.key)).toContain('Strict-Transport-Security');
  });
});
