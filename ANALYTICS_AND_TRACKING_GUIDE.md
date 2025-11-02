# 数据埋点和用户行为分析完整指南

## 🎯 方案概览：Railway + Supabase + Google Vision OCR

### 为什么这是最佳组合？

| 组件 | 作用 | 月度成本 | 优势 |
|------|------|---------|------|
| **Railway** | 后端 API 托管 | $0-20 | 自动部署，简单 |
| **Supabase** | PostgreSQL 数据库 | $0-25 | 免费版足够，内置分析 |
| **Google Cloud Vision** | OCR 文本提取 | $0-15 | 准确率最高 98-99% |
| **Google Analytics 4** | 前端用户行为追踪 | $0 | 免费，功能强大 |
| **PostHog** (可选) | 产品分析 | $0-20 | 开源，自托管 |
| **总计** | - | **$0-80/月** | 性价比最高 |

---

## 📊 完整架构图（含数据埋点）

```
┌──────────────────────────────────────────────────────────┐
│                    前端 (Next.js)                         │
│  - Google Analytics 4 (页面浏览、点击事件)                │
│  - PostHog (用户会话录制、热力图)                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼ API 请求（带 User ID 和事件追踪）
┌──────────────────────────────────────────────────────────┐
│              Railway (NestJS API)                         │
│  - 自定义埋点中间件（记录每次 API 调用）                  │
│  - Winston 日志（结构化日志 + 事件追踪）                  │
└────────────────────┬─────────────────────────────────────┘
                     │
         ┌───────────┴───────────┬─────────────────┐
         ▼                       ▼                 ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐
│ Supabase        │   │ Google Cloud    │   │ Google       │
│ (PostgreSQL)    │   │ Vision API      │   │ Analytics 4  │
│                 │   │                 │   │              │
│ - users         │   │ - OCR 调用      │   │ - 页面浏览    │
│ - documents     │   │ - 文本提取      │   │ - 用户留存    │
│ - conversations │   │                 │   │ - 转化漏斗    │
│ - messages      │   └─────────────────┘   │              │
│ - analytics_    │                          └──────────────┘
│   events ⭐      │
│   (埋点数据)    │
└─────────────────┘
```

---

## 🔍 核心埋点表设计

### 1. **analytics_events 表（核心埋点表）**

这是所有用户行为的**统一埋点表**，记录每一次关键操作。

```sql
-- Supabase SQL 编辑器执行
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 用户信息
  user_id UUID REFERENCES users(id),
  session_id TEXT NOT NULL,  -- 会话 ID（前端生成）
  
  -- 事件信息
  event_name TEXT NOT NULL,  -- 事件名称（page_view, file_upload, chat_message 等）
  event_category TEXT NOT NULL,  -- 事件类别（user, document, chat, system）
  
  -- 事件详情（JSON 灵活存储）
  event_properties JSONB DEFAULT '{}',  -- 自定义属性
  
  -- 上下文信息
  page_url TEXT,  -- 页面 URL
  referrer TEXT,  -- 来源页面
  user_agent TEXT,  -- 浏览器信息
  ip_address INET,  -- IP 地址（可选，注意隐私）
  
  -- 设备信息
  device_type TEXT,  -- mobile / desktop / tablet
  browser TEXT,  -- Chrome / Safari / Firefox
  os TEXT,  -- macOS / Windows / iOS
  
  -- 地理位置（可选）
  country TEXT,
  city TEXT,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 索引优化
  INDEX idx_user_events ON analytics_events(user_id, created_at DESC),
  INDEX idx_event_name ON analytics_events(event_name, created_at DESC),
  INDEX idx_session ON analytics_events(session_id, created_at DESC)
);

-- 添加注释
COMMENT ON TABLE analytics_events IS '用户行为埋点数据表';
COMMENT ON COLUMN analytics_events.event_properties IS '事件自定义属性，JSON 格式存储';
```

### 2. **api_usage_logs 表（API 调用统计）**

专门记录 API 调用，用于成本分析和限流。

```sql
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  -- API 信息
  endpoint TEXT NOT NULL,  -- /chat, /upload, /ocr/:id
  method TEXT NOT NULL,  -- GET / POST / PUT
  status_code INTEGER NOT NULL,  -- 200, 400, 500
  
  -- 性能指标
  response_time_ms INTEGER,  -- 响应时间（毫秒）
  request_size_bytes INTEGER,  -- 请求大小
  response_size_bytes INTEGER,  -- 响应大小
  
  -- 外部 API 调用（成本追踪）
  external_api_calls JSONB DEFAULT '{}',  
  -- 例如: {"google_vision": 1, "deepseek": 1, "tokens": 1500}
  
  -- 错误信息
  error_message TEXT,
  error_stack TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_user_api_usage ON api_usage_logs(user_id, created_at DESC),
  INDEX idx_endpoint ON api_usage_logs(endpoint, created_at DESC)
);

COMMENT ON TABLE api_usage_logs IS 'API 调用日志和成本追踪';
```

### 3. **user_daily_stats 表（每日统计）**

每天凌晨自动聚合，用于快速查询。

```sql
CREATE TABLE user_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  
  -- 使用统计
  files_uploaded INTEGER DEFAULT 0,
  ocr_pages_processed INTEGER DEFAULT 0,
  chat_messages_sent INTEGER DEFAULT 0,
  chat_sessions INTEGER DEFAULT 0,
  
  -- API 调用统计
  api_requests_total INTEGER DEFAULT 0,
  api_requests_success INTEGER DEFAULT 0,
  api_requests_failed INTEGER DEFAULT 0,
  
  -- 成本统计（美元）
  google_vision_cost DECIMAL(10, 4) DEFAULT 0,
  deepseek_cost DECIMAL(10, 4) DEFAULT 0,
  storage_cost DECIMAL(10, 4) DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  
  -- 时间统计
  active_time_minutes INTEGER DEFAULT 0,  -- 活跃时长
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date),
  INDEX idx_user_daily ON user_daily_stats(user_id, date DESC)
);

COMMENT ON TABLE user_daily_stats IS '用户每日使用统计（凌晨聚合）';
```

---

## 🎯 关键事件埋点定义

### 事件分类体系

```typescript
// apps/api/src/analytics/events.types.ts

export enum EventCategory {
  USER = 'user',          // 用户相关
  DOCUMENT = 'document',  // 文档相关
  CHAT = 'chat',         // 对话相关
  SYSTEM = 'system',     // 系统相关
}

export enum EventName {
  // 用户事件
  USER_SIGNUP = 'user_signup',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  
  // 文档事件
  FILE_UPLOAD_START = 'file_upload_start',
  FILE_UPLOAD_SUCCESS = 'file_upload_success',
  FILE_UPLOAD_FAILED = 'file_upload_failed',
  FILE_DOWNLOAD = 'file_download',
  FILE_DELETE = 'file_delete',
  
  // OCR 事件
  OCR_START = 'ocr_start',
  OCR_SUCCESS = 'ocr_success',
  OCR_FAILED = 'ocr_failed',
  
  // 对话事件
  CHAT_SESSION_START = 'chat_session_start',
  CHAT_MESSAGE_SENT = 'chat_message_sent',
  CHAT_MESSAGE_RECEIVED = 'chat_message_received',
  HINT_LEVEL_CHANGED = 'hint_level_changed',
  
  // 系统事件
  API_ERROR = 'api_error',
  PAGE_VIEW = 'page_view',
}

export interface AnalyticsEvent {
  userId?: string;
  sessionId: string;
  eventName: EventName;
  eventCategory: EventCategory;
  eventProperties?: Record<string, any>;
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  os?: string;
}
```

---

## 🔧 后端实现：埋点中间件

### 1. **创建 Analytics 模块**

```bash
cd apps/api
nest g module analytics
nest g service analytics
```

### 2. **Analytics Service**

```typescript
// apps/api/src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsEvent, EventName, EventCategory } from './events.types';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 记录事件到数据库
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          userId: event.userId,
          sessionId: event.sessionId,
          eventName: event.eventName,
          eventCategory: event.eventCategory,
          eventProperties: event.eventProperties || {},
          pageUrl: event.pageUrl,
          referrer: event.referrer,
          userAgent: event.userAgent,
          deviceType: event.deviceType,
          browser: event.browser,
          os: event.os,
        },
      });
    } catch (error) {
      // 埋点失败不应影响主业务逻辑
      console.error('Analytics tracking failed:', error);
    }
  }

  /**
   * 批量记录事件（提高性能）
   */
  async trackEventsBatch(events: AnalyticsEvent[]): Promise<void> {
    try {
      await this.prisma.analyticsEvent.createMany({
        data: events.map((event) => ({
          userId: event.userId,
          sessionId: event.sessionId,
          eventName: event.eventName,
          eventCategory: event.eventCategory,
          eventProperties: event.eventProperties || {},
          pageUrl: event.pageUrl,
          userAgent: event.userAgent,
        })),
      });
    } catch (error) {
      console.error('Batch analytics tracking failed:', error);
    }
  }

  /**
   * 记录 API 调用日志
   */
  async logApiUsage(data: {
    userId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    externalApiCalls?: Record<string, any>;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.prisma.apiUsageLog.create({
        data: {
          userId: data.userId,
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          responseTimeMs: data.responseTimeMs,
          externalApiCalls: data.externalApiCalls || {},
          errorMessage: data.errorMessage,
        },
      });
    } catch (error) {
      console.error('API usage logging failed:', error);
    }
  }

  /**
   * 获取用户使用统计
   */
  async getUserStats(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.userDailyStat.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * 获取实时活跃用户数
   */
  async getActiveUsers(minutes: number = 5): Promise<number> {
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
   * 获取热门页面
   */
  async getTopPages(limit: number = 10) {
    return this.prisma.analyticsEvent.groupBy({
      by: ['pageUrl'],
      where: {
        eventName: EventName.PAGE_VIEW,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });
  }
}
```

### 3. **埋点中间件**

```typescript
// apps/api/src/analytics/analytics.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { EventName, EventCategory } from './events.types';

@Injectable()
export class AnalyticsMiddleware implements NestMiddleware {
  constructor(private analyticsService: AnalyticsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // 提取用户信息
    const userId = (req as any).user?.id;  // 假设 AuthGuard 已注入 user
    const sessionId = req.headers['x-session-id'] as string;

    // 监听响应结束
    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;

      // 记录 API 调用日志
      await this.analyticsService.logApiUsage({
        userId,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: responseTime,
      });

      // 记录特定事件
      if (req.path.includes('/upload') && req.method === 'POST' && res.statusCode === 201) {
        await this.analyticsService.trackEvent({
          userId,
          sessionId,
          eventName: EventName.FILE_UPLOAD_SUCCESS,
          eventCategory: EventCategory.DOCUMENT,
          eventProperties: {
            fileSize: req.body?.size,
            mimeType: req.body?.mimetype,
          },
        });
      }

      if (req.path.includes('/chat') && req.method === 'POST') {
        await this.analyticsService.trackEvent({
          userId,
          sessionId,
          eventName: EventName.CHAT_MESSAGE_SENT,
          eventCategory: EventCategory.CHAT,
          eventProperties: {
            messageLength: req.body?.message?.length,
            hintLevel: req.body?.hintLevel,
          },
        });
      }
    });

    next();
  }
}
```

### 4. **注册中间件**

```typescript
// apps/api/src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module';
import { AnalyticsMiddleware } from './analytics/analytics.middleware';

@Module({
  imports: [
    // ... 其他模块
    AnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 对所有路由启用埋点中间件
    consumer.apply(AnalyticsMiddleware).forRoutes('*');
  }
}
```

---

## 📱 前端实现：Google Analytics 4 集成

### 1. **安装 GA4**

```bash
cd apps/web
pnpm add react-ga4
```

### 2. **初始化 GA4**

```typescript
// apps/web/lib/analytics.ts
import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

export const initGA = () => {
  ReactGA.initialize(GA_MEASUREMENT_ID, {
    gaOptions: {
      debug_mode: process.env.NODE_ENV === 'development',
    },
  });
};

/**
 * 页面浏览追踪
 */
export const trackPageView = (path: string) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

/**
 * 事件追踪
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

/**
 * 用户 ID 设置
 */
export const setUserId = (userId: string) => {
  ReactGA.set({ userId });
};

/**
 * 自定义维度
 */
export const setCustomDimension = (dimension: string, value: string) => {
  ReactGA.set({ [dimension]: value });
};
```

### 3. **在 _app.tsx 中初始化**

```typescript
// apps/web/app/_app.tsx (或 layout.tsx for App Router)
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { initGA, trackPageView } from '../lib/analytics';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // 初始化 GA4
    initGA();

    // 监听路由变化
    const handleRouteChange = (url: string) => {
      trackPageView(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return <Component {...pageProps} />;
}
```

### 4. **在关键操作中埋点**

```typescript
// apps/web/app/upload/page.tsx
import { trackEvent } from '@/lib/analytics';

export default function UploadPage() {
  const handleUpload = async (file: File) => {
    // 追踪上传开始
    trackEvent('Document', 'Upload Started', file.type, file.size);

    try {
      const result = await ApiClient.uploadFile(file);

      // 追踪上传成功
      trackEvent('Document', 'Upload Success', file.type, file.size);
    } catch (error) {
      // 追踪上传失败
      trackEvent('Document', 'Upload Failed', error.message);
    }
  };

  return (
    // ... UI
  );
}
```

```typescript
// apps/web/app/chat/page.tsx
import { trackEvent } from '@/lib/analytics';

export default function ChatPage() {
  const handleSend = async (message: string) => {
    // 追踪发送消息
    trackEvent('Chat', 'Message Sent', 'Length: ' + message.length);

    try {
      const response = await ApiClient.chat({ message });

      // 追踪收到回复
      trackEvent('Chat', 'Message Received', `Hint Level: ${response.hintLevel}`);
    } catch (error) {
      trackEvent('Chat', 'Chat Error', error.message);
    }
  };

  return (
    // ... UI
  );
}
```

---

## 📈 数据分析和仪表盘

### 1. **Supabase 内置分析**

Supabase 提供了简单的数据库查询界面，可以快速查看统计数据。

```sql
-- 最近 7 天活跃用户数
SELECT COUNT(DISTINCT user_id) as active_users
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 最热门的功能
SELECT event_name, COUNT(*) as count
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_name
ORDER BY count DESC
LIMIT 10;

-- 用户留存率（次日留存）
WITH day1_users AS (
  SELECT DISTINCT user_id, DATE(created_at) as signup_date
  FROM analytics_events
  WHERE event_name = 'user_signup'
),
day2_active AS (
  SELECT DISTINCT ae.user_id, d1.signup_date
  FROM analytics_events ae
  JOIN day1_users d1 ON ae.user_id = d1.user_id
  WHERE DATE(ae.created_at) = d1.signup_date + INTERVAL '1 day'
)
SELECT 
  d1.signup_date,
  COUNT(d1.user_id) as signups,
  COUNT(d2.user_id) as day2_active,
  ROUND(COUNT(d2.user_id)::NUMERIC / COUNT(d1.user_id) * 100, 2) as retention_rate
FROM day1_users d1
LEFT JOIN day2_active d2 ON d1.user_id = d2.user_id AND d1.signup_date = d2.signup_date
GROUP BY d1.signup_date
ORDER BY d1.signup_date DESC;

-- 平均 OCR 处理时间
SELECT 
  DATE(created_at) as date,
  COUNT(*) as ocr_count,
  AVG((event_properties->>'processingTimeMs')::INTEGER) as avg_time_ms
FROM analytics_events
WHERE event_name = 'ocr_success'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- API 错误率
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors,
  ROUND(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100, 2) as error_rate
FROM api_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY endpoint
ORDER BY error_rate DESC;
```

### 2. **创建管理后台 API**

```typescript
// apps/api/src/analytics/analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AdminGuard } from '../auth/admin.guard';  // 仅管理员访问

@Controller('analytics')
@UseGuards(AdminGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/overview
   * 总览数据
   */
  @Get('overview')
  async getOverview() {
    const [
      activeUsers5min,
      activeUsers24h,
      totalEvents,
      topPages,
    ] = await Promise.all([
      this.analyticsService.getActiveUsers(5),
      this.analyticsService.getActiveUsers(24 * 60),
      this.prisma.analyticsEvent.count(),
      this.analyticsService.getTopPages(5),
    ]);

    return {
      activeUsers: {
        now: activeUsers5min,
        today: activeUsers24h,
      },
      totalEvents,
      topPages,
    };
  }

  /**
   * GET /analytics/user-stats?userId=xxx&days=7
   * 用户统计
   */
  @Get('user-stats')
  async getUserStats(
    @Query('userId') userId: string,
    @Query('days') days: number = 7,
  ) {
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.analyticsService.getUserStats(userId, startDate, endDate);
  }

  /**
   * GET /analytics/api-usage?days=7
   * API 使用统计
   */
  @Get('api-usage')
  async getApiUsage(@Query('days') days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await this.prisma.apiUsageLog.groupBy({
      by: ['endpoint'],
      where: {
        createdAt: { gte: since },
      },
      _count: { id: true },
      _avg: { responseTimeMs: true },
    });

    return logs.map((log) => ({
      endpoint: log.endpoint,
      requests: log._count.id,
      avgResponseTime: Math.round(log._avg.responseTimeMs),
    }));
  }

  /**
   * GET /analytics/cost?days=30
   * 成本统计（Google Vision + DeepSeek）
   */
  @Get('cost')
  async getCostAnalysis(@Query('days') days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 统计 Google Vision API 调用次数
    const visionCalls = await this.prisma.analyticsEvent.count({
      where: {
        eventName: 'ocr_success',
        createdAt: { gte: since },
      },
    });

    // 统计 DeepSeek API tokens 使用量
    const tokenUsage = await this.prisma.message.aggregate({
      where: {
        createdAt: { gte: since },
        tokensUsed: { not: null },
      },
      _sum: { tokensUsed: true },
    });

    // 成本计算
    const visionCost = visionCalls > 1000 
      ? (visionCalls - 1000) * 1.5 / 1000  // 前 1000 免费，之后 $1.5/1000页
      : 0;

    const deepseekCost = (tokenUsage._sum.tokensUsed || 0) / 1000000 * 10;  // $10/百万tokens

    return {
      googleVision: {
        calls: visionCalls,
        cost: visionCost.toFixed(2),
      },
      deepseek: {
        tokens: tokenUsage._sum.tokensUsed,
        cost: deepseekCost.toFixed(2),
      },
      total: (visionCost + deepseekCost).toFixed(2),
    };
  }
}
```

---

## 🎨 前端管理后台（可选）

### 简单的统计页面

```typescript
// apps/web/app/admin/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <div>加载中...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">数据统计</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600">实时活跃用户</h3>
          <p className="text-3xl font-bold">{stats.activeUsers.now}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600">今日活跃用户</h3>
          <p className="text-3xl font-bold">{stats.activeUsers.today}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600">总事件数</h3>
          <p className="text-3xl font-bold">{stats.totalEvents}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">热门页面</h2>
        <ul>
          {stats.topPages.map((page, index) => (
            <li key={index} className="flex justify-between py-2 border-b">
              <span>{page.pageUrl}</span>
              <span className="font-bold">{page._count.id} 次访问</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

## 💰 成本追踪实现

### Google Vision API 成本计算

```typescript
// apps/api/src/ocr/vision.service.ts
import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class VisionService {
  constructor(
    private vision: vision.ImageAnnotatorClient,
    private analytics: AnalyticsService,
  ) {}

  async extractText(gcsPath: string, documentId: string) {
    const startTime = Date.now();

    try {
      const [result] = await this.vision.documentTextDetection(gcsPath);

      const pageCount = result.fullTextAnnotation?.pages?.length || 1;

      // 记录 OCR 成功事件
      await this.analytics.trackEvent({
        eventName: EventName.OCR_SUCCESS,
        eventCategory: EventCategory.DOCUMENT,
        eventProperties: {
          documentId,
          pageCount,
          processingTimeMs: Date.now() - startTime,
          gcsPath,
        },
      });

      // 保存 OCR 结果到数据库...

      return result;
    } catch (error) {
      // 记录 OCR 失败事件
      await this.analytics.trackEvent({
        eventName: EventName.OCR_FAILED,
        eventCategory: EventCategory.DOCUMENT,
        eventProperties: {
          documentId,
          error: error.message,
        },
      });

      throw error;
    }
  }
}
```

### DeepSeek API 成本追踪

```typescript
// apps/api/src/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AiService {
  constructor(private analytics: AnalyticsService) {}

  async chat(messages: Array<{ role: string; content: string }>) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
      }),
    });

    const data = await response.json();

    // 记录 tokens 使用量
    const tokensUsed = data.usage.total_tokens;

    // 保存到数据库，用于成本计算
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        tokensUsed,
        modelUsed: 'deepseek-chat',
      },
    });

    return {
      reply: data.choices[0].message.content,
      tokensUsed,
    };
  }
}
```

---

## 📊 推荐的数据分析工具

### 1. **Google Analytics 4**（免费）

**优势**:
- ✅ 完全免费
- ✅ 功能强大（用户留存、转化漏斗、实时报告）
- ✅ 与 Google Ads 集成

**适合**:
- 网站流量分析
- 用户行为追踪
- 营销效果评估

### 2. **PostHog**（开源，可自托管）

**优势**:
- ✅ 开源免费
- ✅ 会话录制（看用户如何操作）
- ✅ 功能标志（Feature Flags）
- ✅ A/B 测试

**成本**:
- 自托管: $0（部署在 Railway）
- 云版: $0-20/月（1M events 免费）

**安装**:
```bash
pnpm add posthog-js
```

```typescript
// apps/web/lib/posthog.ts
import posthog from 'posthog-js';

export const initPostHog = () => {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    autocapture: true,  // 自动捕获点击事件
    session_recording: {
      enabled: true,  // 会话录制
    },
  });
};

export { posthog };
```

### 3. **Metabase**（开源，可视化仪表盘）

**优势**:
- ✅ 连接 Supabase 直接查询
- ✅ 拖拽式仪表盘
- ✅ 定时邮件报告

**部署**:
```bash
# 在 Railway 上部署 Metabase
railway add metabase
```

---

## 🎯 最佳实践

### 1. **异步埋点**

埋点操作不应阻塞主业务逻辑：

```typescript
// ❌ 错误：同步埋点
await this.analytics.trackEvent(...);
return result;

// ✅ 正确：异步埋点
this.analytics.trackEvent(...).catch(console.error);  // fire-and-forget
return result;
```

### 2. **采样策略**

对于高频事件，可以采样记录：

```typescript
// 只记录 10% 的页面浏览事件
if (Math.random() < 0.1) {
  await this.analytics.trackEvent({
    eventName: EventName.PAGE_VIEW,
    ...
  });
}
```

### 3. **隐私保护**

遵守 GDPR / CCPA 等法规：

```typescript
// 不记录敏感信息
event_properties: {
  messageLength: message.length,  // ✅ 统计值
  // message: message,  // ❌ 不记录原文
}
```

### 4. **成本告警**

在 Google Cloud Console 设置预算告警：

```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Study Oasis Monthly Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

---

## 📈 总结

### 完整的数据埋点体系

| 层级 | 工具 | 作用 | 成本 |
|------|------|------|------|
| **前端** | Google Analytics 4 | 页面浏览、用户行为 | $0 |
| **后端** | Supabase + 自建表 | 业务事件、API 调用 | $0-25 |
| **成本追踪** | analytics_events 表 | Google Vision + DeepSeek 用量 | $0 |
| **可视化** | Supabase Dashboard | SQL 查询和简单图表 | $0 |
| **高级分析** | PostHog (可选) | 会话录制、漏斗分析 | $0-20 |

### 月度总成本预估（1000 用户）

| 项目 | 成本 |
|------|------|
| Railway (API) | $20 |
| Supabase (数据库) | $25 |
| Google Vision (5000 页) | $6 |
| DeepSeek API (100万 tokens) | $10 |
| 数据分析工具 | $0 (全用免费版) |
| **总计** | **$61/月** |

---

需要我帮你开始实施数据埋点吗？我建议从创建 `analytics_events` 表开始！
