import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventName, EventCategory, DeviceType } from './analytics.types';

/**
 * 事件数据接口
 */
export interface AnalyticsEventProperties {
  [key: string]: string | number | boolean | null;
}

export interface AnalyticsEventData {
  userId?: string;
  sessionId: string;
  eventName: EventName | string;
  eventCategory: EventCategory | string;
  eventProperties?: AnalyticsEventProperties;
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
  deviceType?: DeviceType | string;
  browser?: string;
  os?: string;
}

/**
 * API 使用日志数据接口
 */
export interface ExternalApiCallMetrics {
  name: string;
  count: number;
  totalLatencyMs?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface ApiUsageData {
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs?: number;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
  externalApiCalls?: Record<string, ExternalApiCallMetrics>;
  errorMessage?: string;
  errorStack?: string;
}

/**
 * Prisma groupBy 结果类型 - 事件名称统计
 */
interface EventNameGroupResult {
  eventName: string;
  _count: {
    eventName: number;
  };
}

/**
 * Prisma groupBy 结果类型 - 用户ID分组
 */
interface UserIdGroupResult {
  userId: string | null;
}

/**
 * 数据分析服务
 *
 * 功能:
 * - 记录用户行为事件
 * - 记录 API 使用情况
 * - 查询统计数据
 * - 成本追踪
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 记录事件
   */
  async trackEvent(data: AnalyticsEventData): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          userId: data.userId,
          sessionId: data.sessionId,
          eventName: data.eventName,
          eventCategory: data.eventCategory,
          eventProperties: data.eventProperties || {},
          pageUrl: data.pageUrl,
          referrer: data.referrer,
          userAgent: data.userAgent,
          deviceType: data.deviceType,
          browser: data.browser,
          os: data.os,
        },
      });

      this.logger.debug(
        `Event tracked: ${data.eventName} for user ${data.userId || 'anonymous'}`,
      );
    } catch (error) {
      this.logger.error('Failed to track event', error);
      // 不抛出错误，避免影响主业务流程
    }
  }

  /**
   * 记录 API 使用
   */
  async logApiUsage(data: ApiUsageData): Promise<void> {
    try {
      await this.prisma.apiUsageLog.create({
        data: {
          userId: data.userId,
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          responseTimeMs: data.responseTimeMs,
          requestSizeBytes: data.requestSizeBytes,
          responseSizeBytes: data.responseSizeBytes,
          externalApiCalls: data.externalApiCalls || {},
          errorMessage: data.errorMessage,
          errorStack: data.errorStack,
        },
      });

      this.logger.debug(
        `API usage logged: ${data.method} ${data.endpoint} - ${data.statusCode}`,
      );
    } catch (error) {
      this.logger.error('Failed to log API usage', error);
    }
  }

  /**
   * 获取活跃用户数（最近 N 分钟）
   */
  async getActiveUsers(minutes: number = 30): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const result = await this.prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: since },
        userId: { not: null },
      },
    });

    return result.length;
  }

  /**
   * 获取事件统计（按事件名称分组）
   */
  async getEventStats(startDate: Date, endDate: Date): Promise<EventStatsItem[]> {
    const result = await this.prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      _count: {
        eventName: true,
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        _count: {
          eventName: 'desc',
        },
      },
    });

    return result.map((item: EventNameGroupResult) => ({
      eventName: item.eventName,
      count: item._count.eventName,
    }));
  }

  /**
   * 获取 API 错误率
   */
  async getApiErrorRate(hours: number = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const total = await this.prisma.apiUsageLog.count({
      where: { createdAt: { gte: since } },
    });

    const errors = await this.prisma.apiUsageLog.count({
      where: {
        createdAt: { gte: since },
        statusCode: { gte: 400 },
      },
    });

    return total > 0 ? (errors / total) * 100 : 0;
  }

  /**
   * 获取平均响应时间
   */
  async getAverageResponseTime(hours: number = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result = await this.prisma.apiUsageLog.aggregate({
      _avg: {
        responseTimeMs: true,
      },
      where: {
        createdAt: { gte: since },
        responseTimeMs: { not: null },
      },
    });

    return result._avg.responseTimeMs || 0;
  }

  /**
   * 获取 OCR 成本估算（本月）
   */
  async getOcrCost(): Promise<{ count: number; estimatedCost: number }> {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const count = await this.prisma.analyticsEvent.count({
      where: {
        eventName: EventName.OCR_SUCCESS,
        createdAt: { gte: startOfMonth },
      },
    });

    // Google Vision API: 前 1000 页免费，之后 $1.50 / 1000 页
    const estimatedCost = count > 1000 ? ((count - 1000) * 1.5) / 1000 : 0;

    return { count, estimatedCost };
  }

  /**
   * 获取 DeepSeek 成本估算（本月）
   */
  async getDeepseekCost(): Promise<{ tokens: number; estimatedCost: number }> {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const result = await this.prisma.message.aggregate({
      _sum: {
        tokensUsed: true,
      },
      where: {
        createdAt: { gte: startOfMonth },
        tokensUsed: { not: null },
      },
    });

    const tokens = result._sum?.tokensUsed || 0;

    // DeepSeek: $0.14 / 1M input tokens, $0.28 / 1M output tokens
    // 简化估算：平均 $0.21 / 1M tokens
    const estimatedCost = (tokens * 0.21) / 1_000_000;

    return { tokens, estimatedCost };
  }

  /**
   * 获取用户每日统计
   */
  async getUserDailyStats(
    userId: string,
    date: Date,
  ): Promise<UserDailyStatsSummary | null> {
    const stats = await this.prisma.userDailyStat.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    if (!stats) {
      return null;
    }

    return {
      userId: stats.userId ?? userId,
      date: stats.date,
      filesUploaded: stats.filesUploaded,
      ocrPagesProcessed: stats.ocrPagesProcessed,
      chatMessagesSent: stats.chatMessagesSent,
      chatSessions: stats.chatSessions,
      apiRequestsTotal: stats.apiRequestsTotal,
      apiRequestsSuccess: stats.apiRequestsSuccess,
      apiRequestsFailed: stats.apiRequestsFailed,
      googleVisionCost:
        typeof stats.googleVisionCost === 'number'
          ? stats.googleVisionCost
          : stats.googleVisionCost
          ? Number(stats.googleVisionCost)
          : undefined,
      deepseekCost:
        typeof stats.deepseekCost === 'number'
          ? stats.deepseekCost
          : stats.deepseekCost
          ? Number(stats.deepseekCost)
          : undefined,
      storageCost:
        typeof stats.storageCost === 'number'
          ? stats.storageCost
          : stats.storageCost
          ? Number(stats.storageCost)
          : undefined,
      totalCost:
        typeof stats.totalCost === 'number'
          ? stats.totalCost
          : stats.totalCost
          ? Number(stats.totalCost)
          : undefined,
      activeTimeMinutes: stats.activeTimeMinutes,
    };
  }

  /**
   * 更新用户每日统计
   */
  async updateUserDailyStats(
    userId: string,
    date: Date,
    updates: Partial<{
      filesUploaded: number;
      ocrPagesProcessed: number;
      chatMessagesSent: number;
      chatSessions: number;
      apiRequestsTotal: number;
      apiRequestsSuccess: number;
      apiRequestsFailed: number;
      googleVisionCost: number;
      deepseekCost: number;
      storageCost: number;
      totalCost: number;
      activeTimeMinutes: number;
    }>,
  ): Promise<void> {
    try {
      await this.prisma.userDailyStat.upsert({
        where: {
          userId_date: { userId, date },
        },
        create: {
          userId,
          date,
          ...updates,
        },
        update: updates,
      });

      this.logger.debug(
        `User daily stats updated for ${userId} on ${date.toISOString()}`,
      );
    } catch (error) {
      this.logger.error('Failed to update user daily stats', error);
    }
  }

  /**
   * 获取最热门的功能（最近 7 天）
   */
  async getTopFeatures(limit: number = 10): Promise<TopFeatureItem[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      _count: {
        eventName: true,
      },
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: {
        _count: {
          eventName: 'desc',
        },
      },
      take: limit,
    });

    return result.map((item: EventNameGroupResult) => ({
      feature: item.eventName,
      usageCount: item._count.eventName,
    }));
  }

  /**
   * 获取用户留存率（N 天后仍活跃的用户比例）
   */
  async getUserRetention(days: number = 7): Promise<number> {
    const targetDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const today = new Date();

    // 在目标日期活跃的用户
    const activeOnTargetDate = await this.prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lte: new Date(targetDate.setHours(23, 59, 59, 999)),
        },
        userId: { not: null },
      },
    });

    if (activeOnTargetDate.length === 0) {
      return 0;
    }

    const userIds = activeOnTargetDate.map((u: UserIdGroupResult) => u.userId!);

    // 今天仍活跃的用户
    const activeToday = await this.prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lte: new Date(today.setHours(23, 59, 59, 999)),
        },
        userId: { in: userIds },
      },
    });

    return (activeToday.length / activeOnTargetDate.length) * 100;
  }
}

interface EventStatsItem {
  eventName: string;
  count: number;
}

interface TopFeatureItem {
  feature: string;
  usageCount: number;
}

interface UserDailyStatsSummary {
  userId: string;
  date: Date;
  filesUploaded?: number | null;
  ocrPagesProcessed?: number | null;
  chatMessagesSent?: number | null;
  chatSessions?: number | null;
  apiRequestsTotal?: number | null;
  apiRequestsSuccess?: number | null;
  apiRequestsFailed?: number | null;
  googleVisionCost?: number | null;
  deepseekCost?: number | null;
  storageCost?: number | null;
  totalCost?: number | null;
  activeTimeMinutes?: number | null;
}
