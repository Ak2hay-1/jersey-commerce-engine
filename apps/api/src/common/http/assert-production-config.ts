const PLACEHOLDER_MARKERS = ['replace-with', 'change-me', 'changeme', 'dev-secret', 'your-secret', 'example'];
const MIN_SECRET_LENGTH = 32;

export interface ProductionConfigReport {
  errors: string[];
  warnings: string[];
}

type Env = Record<string, string | undefined>;

function isTrue(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
}

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

function checkRequiredSecret(name: string, value: string | undefined, errors: string[]): void {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    errors.push(`${name} is required in production.`);
  } else if (trimmed.length < MIN_SECRET_LENGTH) {
    errors.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters.`);
  } else if (looksLikePlaceholder(trimmed)) {
    errors.push(`${name} still uses a placeholder value; generate a random secret.`);
  }
}

function checkOptionalSecret(name: string, value: string | undefined, errors: string[]): boolean {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return false;
  }
  if (trimmed.length < MIN_SECRET_LENGTH) {
    errors.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters when set.`);
  } else if (looksLikePlaceholder(trimmed)) {
    errors.push(`${name} still uses a placeholder value; generate a random secret.`);
  }
  return true;
}

export function evaluateProductionConfig(env: Env): ProductionConfigReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (env.NODE_ENV !== 'production') {
    return { errors, warnings };
  }

  checkRequiredSecret('JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET, errors);
  checkRequiredSecret('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET, errors);
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET.trim() === env.JWT_REFRESH_SECRET?.trim()) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
  }

  const origins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.includes('*')) {
    errors.push('CORS_ORIGINS must list explicit origins; "*" is not allowed in production.');
  }

  const cookieSecure = isTrue(env.COOKIE_SECURE);
  if ((env.COOKIE_SAMESITE ?? '').toLowerCase() === 'none' && !cookieSecure) {
    errors.push('COOKIE_SAMESITE=none requires COOKIE_SECURE=true.');
  }
  if (!cookieSecure) {
    warnings.push('COOKIE_SECURE is false; refresh cookies can travel over plain HTTP. Enable it once the API is served over HTTPS.');
  }

  if (!checkOptionalSecret('SECRETS_ENCRYPTION_KEY', env.SECRETS_ENCRYPTION_KEY, errors)) {
    warnings.push('SECRETS_ENCRYPTION_KEY is not set; provider secrets (SMTP, MSG91, Razorpay) cannot be stored.');
  }
  if (!checkOptionalSecret('BACKUP_ENCRYPTION_KEY', env.BACKUP_ENCRYPTION_KEY, errors)) {
    warnings.push('BACKUP_ENCRYPTION_KEY is not set; backups will refuse to run in production until it is configured.');
  }
  checkOptionalSecret('BOOTSTRAP_SECRET', env.BOOTSTRAP_SECRET, errors);
  checkOptionalSecret('STOREFRONT_PROXY_SECRET', env.STOREFRONT_PROXY_SECRET, errors);

  return { errors, warnings };
}

/** Fails boot in production when security-critical configuration is unsafe. */
export function assertProductionSecurityConfig(
  env: Env = process.env,
  warn: (message: string) => void = (message) => console.warn(`[security] ${message}`),
): void {
  const { errors, warnings } = evaluateProductionConfig(env);
  warnings.forEach(warn);
  if (errors.length > 0) {
    throw new Error(`Unsafe production configuration:\n- ${errors.join('\n- ')}`);
  }
}
