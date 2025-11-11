import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * 自定义缓存拦截器
 * 只缓存 GET 请求的成功响应
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly cacheTtl: number;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.cacheTtl = this.configService.get<number>('cache.ttl') || 60000;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // 只缓存 GET 请求
    if (method !== 'GET') {
      return next.handle();
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(request);

    // 尝试从缓存获取
    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // 如果缓存中没有，执行请求并缓存结果
    return next.handle().pipe(
      tap(async (response) => {
        // 只缓存成功的响应
        if (response && typeof response === 'object') {
          await this.cacheManager.set(cacheKey, response, this.cacheTtl);
        }
      }),
    );
  }

  /**
   * 生成缓存键
   * 基于 URL 和查询参数
   */
  private generateCacheKey(request: Request): string {
    const url = request.url;
    const query = JSON.stringify(request.query || {});
    return `cache:${url}:${query}`;
  }
}
