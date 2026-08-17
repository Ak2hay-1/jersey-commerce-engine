import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import type { ApiSuccessResponse } from '@jersey-commerce/types';
import { map, type Observable } from 'rxjs';

@Injectable()
export class ApiSuccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ url?: string }>();
    const url = request.url ?? '';
    if (!url.startsWith('/api/') || url.startsWith('/api/v1/media/')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) {
          return data;
        }
        if (typeof data === 'object' && data !== null && 'success' in data) {
          return data;
        }
        const payload: ApiSuccessResponse<unknown> = { success: true, data };
        return payload;
      }),
    );
  }
}
