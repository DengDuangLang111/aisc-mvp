import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // 增加活跃连接数
    this.metricsService.incrementActiveConnections();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = (Date.now() - startTime) / 1000;

          // 记录请求指标
          this.metricsService.recordHttpRequest(
            request.method,
            request.route?.path || request.url,
            response.statusCode,
            duration,
          );

          // 减少活跃连接数
          this.metricsService.decrementActiveConnections();
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;

          // 记录错误请求
          this.metricsService.recordHttpRequest(
            request.method,
            request.route?.path || request.url,
            error.status || 500,
            duration,
          );

          // 减少活跃连接数
          this.metricsService.decrementActiveConnections();
        },
      }),
    );
  }
}
