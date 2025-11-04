import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { EventName, EventCategory } from './analytics.types';

/**
 * Analytics 中间件
 *
 * 自动记录所有 API 请求的使用情况
 */
@Injectable()
export class AnalyticsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AnalyticsMiddleware.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // 获取请求信息
    const userId = (req as any).user?.id; // 如果有用户认证
    const endpoint = req.path;
    const method = req.method;
    const requestSizeBytes = parseInt(req.get('content-length') || '0', 10);

    // 监听响应完成事件
    res.on('finish', async () => {
      const responseTimeMs = Date.now() - startTime;
      const statusCode = res.statusCode;
      const responseSizeBytes = parseInt(res.get('content-length') || '0', 10);

      // 记录 API 使用日志
      await this.analyticsService.logApiUsage({
        userId,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        requestSizeBytes,
        responseSizeBytes,
      });

      // 如果是错误，记录事件
      if (statusCode >= 400) {
        await this.analyticsService.trackEvent({
          userId,
          sessionId: this.getSessionId(req),
          eventName: EventName.API_ERROR,
          eventCategory: EventCategory.SYSTEM,
          eventProperties: {
            endpoint,
            method,
            statusCode,
            responseTimeMs,
          },
        });
      }

      this.logger.debug(
        `${method} ${endpoint} - ${statusCode} - ${responseTimeMs}ms`,
      );
    });

    next();
  }

  /**
   * 从请求中获取或生成 session ID
   */
  private getSessionId(req: Request): string {
    // 可以从 cookie、header 等获取
    // 简单实现：使用 IP + User-Agent 生成
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    return `${ip}-${userAgent}`;
  }
}
