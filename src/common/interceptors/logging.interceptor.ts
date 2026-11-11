import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';

/** Loga método, rota, status e duração de cada requisição HTTP. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const startedAt = performance.now();

    const log = (status: number) => {
      const ms = (performance.now() - startedAt).toFixed(1);
      this.logger.log(
        `${request.method} ${request.originalUrl} ${status} ${ms}ms`,
      );
    };

    return next.handle().pipe(
      tap({
        next: () => log(http.getResponse<Response>().statusCode),
        error: (error: { status?: number }) => log(error.status ?? 500),
      }),
    );
  }
}
