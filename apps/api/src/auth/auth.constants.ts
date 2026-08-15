export const GENERIC_AUTH_ERROR = 'Invalid email or password.';
export const REFRESH_COOKIE_NAME = 'jce_refresh_token';
export const ACCESS_TOKEN_TYPE = 'access' as const;
export const CUSTOMER_TOKEN_TYPE = 'customer' as const;
export const CART_TOKEN_COOKIE = 'jce_cart_token';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  ver: number;
  typ: typeof ACCESS_TOKEN_TYPE;
  jti: string;
}

export interface CustomerAccessTokenPayload {
  sub: string;
  tenantId: string;
  typ: typeof CUSTOMER_TOKEN_TYPE;
  jti: string;
}
