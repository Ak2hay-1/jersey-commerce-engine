import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string }>();
    const path = request.originalUrl ?? request.url ?? '';
    return next.handle().pipe(
      map((data) => {
        if (!path.startsWith('/api/')) {
          return data;
        }
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return { success: true, data };
      }),
    );
  }
}
