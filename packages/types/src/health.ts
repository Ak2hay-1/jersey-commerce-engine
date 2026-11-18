export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

/** @deprecated Kept for older clients; public /ready no longer returns per-dependency checks. */
export interface ReadinessCheck {
  name: string;
  status: 'up' | 'down';
  message?: string;
}

export interface ReadinessResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
}
