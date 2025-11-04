import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

/**
 * Analytics API Controller
 *
 * 提供数据分析和统计查询接口
 */
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 获取活跃用户数
   */
  @Get('active-users')
  @ApiOperation({ summary: '获取活跃用户数' })
  @ApiQuery({
    name: 'minutes',
    required: false,
    description: '时间范围（分钟）',
    example: 30,
  })
  @ApiResponse({ status: 200, description: '返回活跃用户数' })
  async getActiveUsers(@Query('minutes') minutes?: string) {
    const mins = minutes ? parseInt(minutes, 10) : 30;
    const count = await this.analyticsService.getActiveUsers(mins);

    return {
      activeUsers: count,
      timeRange: `${mins} minutes`,
    };
  }

  /**
   * 获取事件统计
   */
  @Get('event-stats')
  @ApiOperation({ summary: '获取事件统计' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '统计天数',
    example: 7,
  })
  @ApiResponse({ status: 200, description: '返回事件统计数据' })
  async getEventStats(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 7;
    const endDate = new Date();
    const startDate = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const stats = await this.analyticsService.getEventStats(startDate, endDate);

    return {
      timeRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      events: stats,
    };
  }

  /**
   * 获取 API 统计
   */
  @Get('api-stats')
  @ApiOperation({ summary: '获取 API 统计' })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: '统计小时数',
    example: 24,
  })
  @ApiResponse({ status: 200, description: '返回 API 统计数据' })
  async getApiStats(@Query('hours') hours?: string) {
    const numHours = hours ? parseInt(hours, 10) : 24;

    const [errorRate, avgResponseTime] = await Promise.all([
      this.analyticsService.getApiErrorRate(numHours),
      this.analyticsService.getAverageResponseTime(numHours),
    ]);

    return {
      timeRange: `${numHours} hours`,
      errorRate: `${errorRate.toFixed(2)}%`,
      averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
    };
  }

  /**
   * 获取成本估算
   */
  @Get('cost')
  @ApiOperation({ summary: '获取成本估算（本月）' })
  @ApiResponse({ status: 200, description: '返回本月成本估算' })
  async getCost() {
    const [ocrCost, deepseekCost] = await Promise.all([
      this.analyticsService.getOcrCost(),
      this.analyticsService.getDeepseekCost(),
    ]);

    const totalCost = ocrCost.estimatedCost + deepseekCost.estimatedCost;

    return {
      month: new Date().toISOString().slice(0, 7),
      ocr: {
        pages: ocrCost.count,
        cost: `$${ocrCost.estimatedCost.toFixed(2)}`,
      },
      ai: {
        tokens: deepseekCost.tokens,
        cost: `$${deepseekCost.estimatedCost.toFixed(2)}`,
      },
      total: {
        cost: `$${totalCost.toFixed(2)}`,
      },
    };
  }

  /**
   * 获取热门功能
   */
  @Get('top-features')
  @ApiOperation({ summary: '获取最热门的功能' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回数量',
    example: 10,
  })
  @ApiResponse({ status: 200, description: '返回热门功能列表' })
  async getTopFeatures(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 10;
    const features = await this.analyticsService.getTopFeatures(numLimit);

    return {
      timeRange: 'Last 7 days',
      features,
    };
  }

  /**
   * 获取用户留存率
   */
  @Get('retention')
  @ApiOperation({ summary: '获取用户留存率' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: '留存天数',
    example: 7,
  })
  @ApiResponse({ status: 200, description: '返回用户留存率' })
  async getRetention(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 7;
    const retention = await this.analyticsService.getUserRetention(numDays);

    return {
      days: numDays,
      retentionRate: `${retention.toFixed(2)}%`,
    };
  }

  /**
   * 获取综合概览
   */
  @Get('overview')
  @ApiOperation({ summary: '获取分析数据综合概览' })
  @ApiResponse({ status: 200, description: '返回分析数据概览' })
  async getOverview() {
    const [activeUsers, apiStats, cost, topFeatures, retention] =
      await Promise.all([
        this.analyticsService.getActiveUsers(30),
        Promise.all([
          this.analyticsService.getApiErrorRate(24),
          this.analyticsService.getAverageResponseTime(24),
        ]),
        Promise.all([
          this.analyticsService.getOcrCost(),
          this.analyticsService.getDeepseekCost(),
        ]),
        this.analyticsService.getTopFeatures(5),
        this.analyticsService.getUserRetention(7),
      ]);

    const [errorRate, avgResponseTime] = apiStats;
    const [ocrCost, deepseekCost] = cost;
    const totalCost = ocrCost.estimatedCost + deepseekCost.estimatedCost;

    return {
      timestamp: new Date().toISOString(),
      activeUsers: {
        count: activeUsers,
        timeRange: '30 minutes',
      },
      api: {
        errorRate: `${errorRate.toFixed(2)}%`,
        averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        timeRange: '24 hours',
      },
      cost: {
        ocr: `$${ocrCost.estimatedCost.toFixed(2)}`,
        ai: `$${deepseekCost.estimatedCost.toFixed(2)}`,
        total: `$${totalCost.toFixed(2)}`,
        month: new Date().toISOString().slice(0, 7),
      },
      topFeatures: topFeatures.slice(0, 5),
      retention: {
        rate: `${retention.toFixed(2)}%`,
        days: 7,
      },
    };
  }
}
