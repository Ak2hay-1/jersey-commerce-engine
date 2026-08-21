import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import type { WebSocket } from 'ws';
import { REALTIME_PATH } from '@jersey-commerce/utils';
import { TokenService } from '../auth/token.service';
import { ACCESS_TOKEN_TYPE } from '../auth/auth.constants';
import { RealtimeService } from './realtime.service';

interface AuthenticatedSocket extends WebSocket {
  tenantId?: string;
}

@WebSocketGateway({ path: REALTIME_PATH })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly realtime: RealtimeService,
    private readonly tokens: TokenService,
  ) {}

  async handleConnection(client: AuthenticatedSocket, request: IncomingMessage): Promise<void> {
    try {
      if (!this.originAllowed(request.headers.origin)) {
        client.close();
        return;
      }
      const token = this.readToken(request);
      if (!token) {
        client.close();
        return;
      }
      const payload = this.tokens.verifyAccessToken(token);
      if (payload.typ !== ACCESS_TOKEN_TYPE || (await this.tokens.isAccessTokenDenied(payload.jti))) {
        client.close();
        return;
      }
      client.tenantId = payload.tenantId;
      this.realtime.register(payload.tenantId, client);
    } catch (error) {
      this.logger.debug(
        `Realtime connection rejected: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.close();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.tenantId) {
      this.realtime.unregister(client.tenantId, client);
    }
  }

  private readToken(request: IncomingMessage): string | undefined {
    try {
      const host = request.headers.host ?? 'localhost';
      const url = new URL(request.url ?? '/', `http://${host}`);
      return url.searchParams.get('token') ?? undefined;
    } catch {
      return undefined;
    }
  }

  private originAllowed(origin: string | undefined): boolean {
    if (!origin) {
      return process.env.NODE_ENV !== 'production';
    }
    const allowed = (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (process.env.NODE_ENV !== 'production' && allowed.length === 0) {
      return true;
    }
    return allowed.includes(origin);
  }
}
