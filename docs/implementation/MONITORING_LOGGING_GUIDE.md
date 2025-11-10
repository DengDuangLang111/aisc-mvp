# 性能监控和日志聚合指南 (P3-8)

## 📝 概述

本指南说明如何配置 Winston 结构化日志、性能监控、日志聚合和错误告警系统。

## 🎯 目标

- ✅ 结构化日志记录（Winston）
- ✅ 性能监控和追踪
- ✅ 错误追踪和告警
- ✅ 日志聚合和分析
- ✅ 生产环境监控

## 📦 依赖安装

```bash
cd apps/api

# Winston 日志系统（已安装）
pnpm add winston nest-winston winston-daily-rotate-file

# 性能监控
pnpm add @sentry/node @sentry/profiling-node

# 指标收集
pnpm add prom-client

# APM (可选)
pnpm add elastic-apm-node
```

## 🔧 Winston 配置增强

### 1. 创建高级日志配置

```typescript
// apps/api/src/config/logger.config.ts
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import LokiTransport from 'winston-loki';

export const createLoggerConfig = (env: string) => {
  const logLevel = env === 'production' ? 'info' : 'debug';
  const serviceMetadataFormat = winston.format((info) => {
    info.service = 'study-oasis-api';
    info.environment = env;
    info.hostname = process.env.HOSTNAME;
    return info;
  });

  // 控制台传输
  const consoleTransport = new winston.transports.Console({
    format:
      env === 'production'
        ? winston.format.combine(
            serviceMetadataFormat(),
            winston.format.timestamp(),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('StudyOasis', {
              colors: true,
              prettyPrint: true,
            }),
          ),
  });

  // 文件传输 - 错误日志
  const errorFileTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  // 文件传输 - 所有日志
  const combinedFileTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  // 性能日志
  const performanceTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/performance-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  const lokiTransport =
    process.env.LOKI_URL && env !== 'test'
      ? new LokiTransport({
          host: process.env.LOKI_URL,
          basicAuth: process.env.LOKI_BASIC_AUTH,
          labels: { service: 'study-oasis-api', environment: env },
          json: true,
          replaceTimestamp: true,
        })
      : null;

  return WinstonModule.createLogger({
    level: logLevel,
    transports: [
      consoleTransport,
      errorFileTransport,
      combinedFileTransport,
      performanceTransport,
      ...(lokiTransport ? [lokiTransport] : []),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
    format: winston.format.combine(
      serviceMetadataFormat(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });
};
```

### 2. 在 main.ts 中使用

```typescript
// apps/api/src/main.ts
import { createLoggerConfig } from './config/logger.config';

async function bootstrap() {
  const logger = createLoggerConfig(process.env.NODE_ENV);
  
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // 使用日志
  logger.log('Application starting...', 'Bootstrap');
  
  // ...
}
```

### 3. 推送日志到 Grafana Loki

1. 安装依赖：`pnpm --filter api add winston-loki`
2. 配置 `.env`：
   ```bash
   LOKI_URL=http://loki:3100
   # 可选
   LOKI_BASIC_AUTH=admin:admin
   ```
3. 生产环境会自动将结构化 JSON 日志推送到 Loki，Grafana 通过 Loki 数据源即可查询 `service=study-oasis-api` 的日志。

## 📊 Sentry 错误追踪

### 1. 配置 Sentry

```typescript
// apps/api/src/sentry.config.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // 性能监控
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    
    // 集成
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: true }),
    ],

    // 忽略某些错误
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'Request aborted',
    ],

    // 附加上下文
    beforeSend(event, hint) {
      // 过滤敏感信息
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    },
  });
}
```

### 2. 创建 Sentry 拦截器

```typescript
// apps/api/src/common/interceptors/sentry.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // 记录到 Sentry
        Sentry.captureException(error, {
          contexts: {
            http: {
              method: context.switchToHttp().getRequest().method,
              url: context.switchToHttp().getRequest().url,
            },
          },
          user: {
            id: context.switchToHttp().getRequest().user?.id,
          },
        });
        
        return throwError(() => error);
      }),
    );
  }
}
```

### 3. 全局应用

```typescript
// apps/api/src/main.ts
import { initSentry } from './sentry.config';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';

async function bootstrap() {
  // 初始化 Sentry
  initSentry();

  const app = await NestFactory.create(AppModule);
  
  // 应用 Sentry 拦截器
  app.useGlobalInterceptors(new SentryInterceptor());
  
  // ...
}
```

## 📈 Prometheus 指标

### 1. 创建指标服务

```typescript
// apps/api/src/metrics/metrics.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: promClient.Registry;
  
  // HTTP 请求计数器
  private readonly httpRequestCounter: promClient.Counter;
  
  // HTTP 请求持续时间
  private readonly httpRequestDuration: promClient.Histogram;
  
  // 活跃连接数
  private readonly activeConnections: promClient.Gauge;
  
  // 业务指标
  private readonly chatRequestCounter: promClient.Counter;
  private readonly uploadCounter: promClient.Counter;

  constructor() {
    this.register = new promClient.Registry();
    
    // 启用默认指标
    promClient.collectDefaultMetrics({ register: this.register });

    // HTTP 请求计数
    this.httpRequestCounter = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // HTTP 请求持续时间
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    // 活跃连接
    this.activeConnections = new promClient.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    // 业务指标
    this.chatRequestCounter = new promClient.Counter({
      name: 'chat_requests_total',
      help: 'Total number of chat requests',
      labelNames: ['hint_level'],
      registers: [this.register],
    });

    this.uploadCounter = new promClient.Counter({
      name: 'file_uploads_total',
      help: 'Total number of file uploads',
      labelNames: ['file_type'],
      registers: [this.register],
    });
  }

  onModuleInit() {
    // 初始化指标
  }

  // 记录 HTTP 请求
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestCounter.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  }

  // 记录聊天请求
  recordChatRequest(hintLevel: number) {
    this.chatRequestCounter.inc({ hint_level: hintLevel });
  }

  // 记录文件上传
  recordFileUpload(fileType: string) {
    this.uploadCounter.inc({ file_type: fileType });
  }

  // 更新活跃连接数
  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  // 获取所有指标
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}
```

### 2. 创建指标控制器

```typescript
// apps/api/src/metrics/metrics.controller.ts
import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
```

### 3. 创建指标拦截器

```typescript
// apps/api/src/common/interceptors/metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = (Date.now() - startTime) / 1000;
        
        this.metricsService.recordHttpRequest(
          request.method,
          request.route?.path || request.url,
          response.statusCode,
          duration,
        );
      }),
    );
  }
}
```

## 🔔 告警配置

### 1. 创建告警服务

```typescript
// apps/api/src/alerts/alert.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Alert {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendAlert(alert: Alert) {
    this.logger.log(`Alert: [${alert.level}] ${alert.title}`, alert.message);

    // 根据告警级别选择通知渠道
    switch (alert.level) {
      case 'critical':
      case 'error':
        await this.sendToSlack(alert);
        await this.sendEmail(alert);
        break;
      case 'warning':
        await this.sendToSlack(alert);
        break;
      case 'info':
        // 仅记录日志
        break;
    }
  }

  private async sendToSlack(alert: Alert) {
    const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ${alert.title}`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${this.getEmoji(alert.level)} ${alert.title}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: alert.message,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Level:* ${alert.level} | *Time:* ${new Date().toISOString()}`,
                },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      this.logger.error('Failed to send Slack alert', error);
    }
  }

  private async sendEmail(alert: Alert) {
    // 实现邮件发送逻辑
    // 可以使用 nodemailer 或其他邮件服务
  }

  private getEmoji(level: string): string {
    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    return emojis[level] || '📢';
  }
}
```

### 2. 错误监控守卫

```typescript
// apps/api/src/common/guards/error-monitor.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AlertService } from '../../alerts/alert.service';

@Injectable()
export class ErrorMonitorGuard implements CanActivate {
  private errorCount = 0;
  private readonly ERROR_THRESHOLD = 10;
  private readonly TIME_WINDOW = 60000; // 1 minute

  constructor(private readonly alertService: AlertService) {
    // 重置错误计数
    setInterval(() => {
      if (this.errorCount > this.ERROR_THRESHOLD) {
        this.alertService.sendAlert({
          level: 'error',
          title: 'High Error Rate Detected',
          message: `${this.errorCount} errors in the last minute`,
        });
      }
      this.errorCount = 0;
    }, this.TIME_WINDOW);
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }

  incrementErrorCount() {
    this.errorCount++;
  }
}
```

## 📊 监控仪表板

### Grafana 配置

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3002:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-clock-panel

volumes:
  prometheus_data:
  grafana_data:
```

### Study Oasis API Dashboard

- 仪表板 JSON：`monitoring/grafana/dashboards/study-oasis-api.json`
- 指标覆盖：
  - `sum(rate(http_requests_total[5m]))` → 请求速率
  - `histogram_quantile(0.95, …http_request_duration_seconds_bucket…)` → p95 延迟
  - `active_connections`, `chat_requests_total` → 并发会话 & 聊天吞吐
  - `file_uploads_total`, `ocr_requests_total` → 上传 / OCR 成功率
- 把该 JSON 放入 Grafana provision 目录后即可在 “Study Oasis API Overview” 中查看。

### Prometheus 配置

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'study-oasis-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
```

## 🧪 健康检查增强

```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheck, 
  HealthCheckService, 
  HttpHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // 数据库检查
      () => this.prisma.isHealthy('database'),
      
      // 内存检查
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      
      // 磁盘检查
      () => this.disk.checkStorage('disk', { 
        path: '/', 
        thresholdPercent: 0.9 
      }),
      
      // 外部服务检查
      () => this.http.pingCheck('openai', 'https://api.openai.com'),
    ]);
  }
}
```

## ✅ 实现检查清单

- [ ] 配置 Winston 日志系统
- [ ] 集成 Sentry 错误追踪
- [ ] 实现 Prometheus 指标
- [ ] 创建告警服务
- [ ] 配置 Grafana 仪表板
- [ ] 接入 Grafana Loki 日志
- [ ] 增强健康检查
- [ ] 设置日志轮转
- [ ] 配置告警通知（Slack/Email）
- [ ] 性能测试和基准测试
- [ ] 文档和运维手册

## 📚 参考资料

- [Winston 文档](https://github.com/winstonjs/winston)
- [Sentry Node.js](https://docs.sentry.io/platforms/node/)
- [Prometheus](https://prometheus.io/docs/introduction/overview/)
- [Grafana](https://grafana.com/docs/)
