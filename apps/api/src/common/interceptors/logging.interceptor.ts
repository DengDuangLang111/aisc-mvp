import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // 记录请求开始
    this.logger.log('info', `Incoming ${method} ${url}`, {
      context: 'HTTP',
      method,
      url,
      ip,
      userAgent,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;

          // 记录请求成功
          this.logger.log('info', `${method} ${url} ${statusCode} - ${responseTime}ms`, {
            context: 'HTTP',
            method,
            url,
            statusCode,
            responseTime,
            ip,
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;

          // 记录请求错误
          this.logger.error(
            `${method} ${url} ${error.status || 500} - ${responseTime}ms`,
            {
              context: 'HTTP',
              method,
              url,
              statusCode: error.status || 500,
              responseTime,
              error: error.message,
              stack: error.stack,
              ip,
            },
          );
        },
      }),
    );
  }
}
