import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { resolveClientIp } from '../../common/http/client-ip';

@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as { ip?: string; headers: Record<string, string | string[] | undefined> };
    return resolveClientIp(request) ?? 'unknown';
  }
}
