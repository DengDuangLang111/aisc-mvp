import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      catchError((error) => {
        // 记录到 Sentry
        Sentry.captureException(error, {
          contexts: {
            http: {
              method: request.method,
              url: request.url,
              status_code: error.status || 500,
            },
          },
          user: {
            id: request.user?.id || request.query?.userId,
          },
          tags: {
            controller: context.getClass().name,
            handler: context.getHandler().name,
          },
          extra: {
            body: request.body,
            query: request.query,
            params: request.params,
          },
        });

        return throwError(() => error);
      }),
    );
  }
}
