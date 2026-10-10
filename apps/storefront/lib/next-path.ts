/** Only same-site relative paths are allowed as a post-login destination (no open redirects). */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.includes('://')) {
    return null;
  }
  if (/[\u0000-\u001f]/.test(trimmed) || trimmed.startsWith('/auth/')) {
    return null;
  }
  return trimmed;
}

export function loginHref(next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe ? `/auth/login?next=${encodeURIComponent(safe)}` : '/auth/login';
}

export function nextFromLocation(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return safeNextPath(new URLSearchParams(window.location.search).get('next'));
}
