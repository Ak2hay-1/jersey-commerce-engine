export interface HealthResponse {
  status: 'ok';
  service: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface ReadinessCheck {
  name: string;
  status: 'up' | 'down';
  message?: string;
}

export interface ReadinessResponse {
  status: 'ok' | 'degraded';
  service: string;
  checks: ReadinessCheck[];
  timestamp: string;
}
