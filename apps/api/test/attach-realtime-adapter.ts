import type { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';

export function attachRealtimeAdapter(app: INestApplication): void {
  app.useWebSocketAdapter(new WsAdapter(app));
}
