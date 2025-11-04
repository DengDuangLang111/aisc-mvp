import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsMiddleware } from './analytics.middleware';

/**
 * Analytics 模块
 *
 * 提供数据埋点和统计分析服务
 */
@Module({
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 为所有路由应用 Analytics 中间件
    consumer.apply(AnalyticsMiddleware).forRoutes('*');
  }
}
