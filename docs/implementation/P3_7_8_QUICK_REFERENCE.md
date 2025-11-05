# P3-7 & P3-8 快速参考

## 🚀 快速启动

### 启动后端（带监控）
```bash
cd /Users/knight/study_oasis_simple
./start-api.sh
```

### 查看 Metrics
```bash
curl http://localhost:4001/metrics
```

### 启动监控栈
```bash
# 创建网络（首次）
docker network create study-oasis-network

# 启动 Prometheus + Grafana + Alertmanager
docker-compose -f docker-compose.monitoring.yml up -d

# 查看状态
docker-compose -f docker-compose.monitoring.yml ps

# 查看日志
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 访问监控面板
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002 (admin/admin)
- **Alertmanager**: http://localhost:9093
- **API Metrics**: http://localhost:4001/metrics

---

## 📦 文件结构

```
apps/
├── api/src/
│   ├── config/
│   │   ├── logger.config.ts          # Winston 日志配置
│   │   └── sentry.config.ts          # Sentry 错误追踪
│   ├── common/interceptors/
│   │   ├── sentry.interceptor.ts     # Sentry 拦截器
│   │   └── metrics.interceptor.ts    # Metrics 拦截器
│   ├── metrics/
│   │   ├── metrics.service.ts        # Prometheus 服务
│   │   ├── metrics.controller.ts     # /metrics 端点
│   │   └── metrics.module.ts
│   ├── alerts/
│   │   ├── alert.service.ts          # 告警服务
│   │   └── alert.module.ts
│   ├── main.ts                        # 添加 Sentry 初始化
│   └── app.module.ts                  # 导入新模块
│
└── web/components/
    ├── VirtualChatList.tsx            # 虚拟滚动列表
    ├── TanStackVirtualList.tsx        # 动态高度列表
    ├── VirtualChat.css                # 样式
    ├── index.ts                       # 导出
    └── __tests__/
        └── VirtualChatList.test.tsx   # 单元测试

monitoring/
├── prometheus.yml                     # Prometheus 配置
├── alerts.yml                         # 6 条告警规则
├── alertmanager.yml                   # 告警路由配置
└── grafana/
    ├── datasources/prometheus.yml     # 数据源
    └── dashboards/dashboard.yml       # 仪表板

docker-compose.monitoring.yml          # 监控栈 Compose
```

---

## 🔧 代码片段

### 使用虚拟滚动列表

```tsx
import { VirtualChatList } from '@/components';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: '1', content: 'Hello', role: 'user', timestamp: new Date().toISOString() },
    { id: '2', content: 'Hi there!', role: 'assistant', timestamp: new Date().toISOString() },
    // ... 更多消息
  ]);

  return (
    <VirtualChatList
      messages={messages}
      height={600}           // 容器高度
      itemSize={80}          // 每项固定高度
      onScrollToBottom={() => console.log('到底了')}
    />
  );
}
```

### 使用动态高度列表

```tsx
import { TanStackVirtualList } from '@/components';

export default function DynamicList() {
  const [messages, setMessages] = useState([...]);

  return (
    <TanStackVirtualList
      messages={messages}
      height={600}
      estimatedItemSize={100}  // 预估高度
      onScrollToBottom={() => {}}
    />
  );
}
```

### 使用告警服务

```typescript
import { Injectable } from '@nestjs/common';
import { AlertService } from './alerts/alert.service';

@Injectable()
export class MyService {
  constructor(private alertService: AlertService) {}

  async criticalOperation() {
    try {
      // 业务逻辑
    } catch (error) {
      // 发送 Critical 告警到 Slack
      await this.alertService.sendCritical(
        'Critical Operation Failed',
        error.message,
        {
          operation: 'criticalOperation',
          userId: 'user123',
          timestamp: new Date().toISOString()
        }
      );
      throw error;
    }
  }

  async warningCase() {
    await this.alertService.sendWarning(
      'High Memory Usage Detected',
      `Memory: ${process.memoryUsage().heapUsed / 1024 / 1024}MB`,
      { service: 'api', threshold: '500MB' }
    );
  }
}
```

### 记录业务指标

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from './metrics/metrics.service';

@Injectable()
export class ChatService {
  constructor(private metricsService: MetricsService) {}

  async processChat(userId: string, message: string, model: string) {
    // 记录聊天请求
    this.metricsService.recordChatRequest(userId, model);
    
    // 处理聊天...
    const response = await this.generateResponse(message, model);
    
    return response;
  }
}

@Injectable()
export class UploadService {
  constructor(private metricsService: MetricsService) {}

  async uploadFile(userId: string, file: Express.Multer.File) {
    // 记录文件上传
    this.metricsService.recordFileUpload(userId, file.mimetype);
    
    // 处理上传...
  }
}

@Injectable()
export class OcrService {
  constructor(private metricsService: MetricsService) {}

  async processOcr(userId: string, fileId: string) {
    try {
      const result = await this.performOcr(fileId);
      
      // 记录成功的 OCR
      this.metricsService.recordOcrRequest(userId, 'success');
      
      return result;
    } catch (error) {
      // 记录失败的 OCR
      this.metricsService.recordOcrRequest(userId, 'failure');
      throw error;
    }
  }
}
```

---

## 📊 监控查询示例

### Prometheus 查询

```promql
# HTTP 请求速率（每秒）
rate(http_requests_total[5m])

# 平均响应时间
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# 95th 百分位响应时间
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 错误率
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# 活跃连接数
active_connections

# 聊天请求速率
rate(chat_requests_total[5m])

# 内存使用
study_oasis_process_resident_memory_bytes / 1024 / 1024

# CPU 使用率
rate(study_oasis_process_cpu_seconds_total[5m]) * 100
```

---

## 🔔 告警规则说明

### 1. APIDown (Critical)
```yaml
触发条件: API 不可用超过 1 分钟
严重级别: Critical
通知渠道: Slack (立即)
```

### 2. HighErrorRate (Warning)
```yaml
触发条件: 5xx 错误率 > 5% 持续 5 分钟
严重级别: Warning
通知渠道: Slack (5 分钟延迟)
```

### 3. HighResponseTime (Warning)
```yaml
触发条件: 95th 响应时间 > 2 秒持续 5 分钟
严重级别: Warning
通知渠道: Slack (5 分钟延迟)
```

### 4. HighMemoryUsage (Warning)
```yaml
触发条件: RSS 内存 > 500MB 持续 10 分钟
严重级别: Warning
通知渠道: Slack (5 分钟延迟)
```

### 5. HighCPUUsage (Warning)
```yaml
触发条件: CPU 使用率 > 80% 持续 10 分钟
严重级别: Warning
通知渠道: Slack (5 分钟延迟)
```

### 6. RequestSpike (Info)
```yaml
触发条件: 请求速率 > 100 req/s 持续 2 分钟
严重级别: Info
通知渠道: Email
```

---

## 🌍 环境变量配置

```bash
# .env 文件

# Sentry (可选)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1

# Slack (可选)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Email (可选)
ALERT_EMAIL_TO=alerts@yourdomain.com
ALERT_EMAIL_FROM=noreply@yourdomain.com
```

---

## 🧪 测试命令

### 前端测试
```bash
cd apps/web
pnpm test
pnpm run build  # 验证编译
```

### 后端测试
```bash
cd apps/api
pnpm run lint   # 代码检查
pnpm run build  # 验证编译
pnpm run test   # 运行测试
```

### 监控测试
```bash
# 测试 metrics 端点
curl http://localhost:4001/metrics

# 测试 Prometheus
curl http://localhost:9090/-/healthy

# 测试 Grafana
curl http://localhost:3002/api/health

# 测试 Alertmanager
curl http://localhost:9093/-/healthy
```

### 压力测试
```bash
# 使用 ApacheBench
ab -n 1000 -c 10 http://localhost:4001/health

# 使用 wrk
wrk -t 4 -c 100 -d 30s http://localhost:4001/health
```

---

## 📝 日志文件位置

```
apps/api/logs/
├── error-2025-11-04.log          # 错误日志（14天轮换）
├── combined-2025-11-04.log       # 综合日志（14天轮换）
└── performance-2025-11-04.log    # 性能日志（7天轮换）
```

---

## 🔍 故障排查

### Metrics 端点返回 404
```bash
# 检查 MetricsModule 是否导入
grep -r "MetricsModule" apps/api/src/app.module.ts

# 检查服务是否启动
curl http://localhost:4001/health

# 查看日志
tail -f apps/api/logs/error-*.log
```

### Prometheus 无法抓取数据
```bash
# 检查 API 是否可访问
curl http://host.docker.internal:4001/metrics

# 检查 Prometheus 配置
docker exec -it prometheus cat /etc/prometheus/prometheus.yml

# 查看 Prometheus 日志
docker-compose -f docker-compose.monitoring.yml logs prometheus
```

### 告警未触发
```bash
# 检查 Alertmanager 状态
curl http://localhost:9093/api/v1/status

# 查看活跃告警
curl http://localhost:9093/api/v1/alerts

# 检查告警规则
curl http://localhost:9090/api/v1/rules
```

### 虚拟滚动性能问题
1. 检查 `itemSize` 是否设置合理
2. 检查 `overscan` 值（默认 5）
3. 使用 React DevTools Profiler 分析
4. 检查是否有不必要的重渲染

---

## 📖 相关文档

- [完整实施报告](./P3_7_8_COMPLETION_REPORT.md)
- [TanStack Virtual 文档](https://tanstack.com/virtual/latest)
- [Prometheus 文档](https://prometheus.io/docs/)
- [Grafana 文档](https://grafana.com/docs/)
- [Winston 文档](https://github.com/winstonjs/winston)
- [Sentry 文档](https://docs.sentry.io/)

---

## 🎯 下一步行动

- [ ] 配置 Sentry DSN
- [ ] 配置 Slack Webhook
- [ ] 创建自定义 Grafana 仪表板
- [ ] 调整告警阈值
- [ ] 添加更多业务指标
- [ ] 编写更多单元测试
- [ ] 进行性能压力测试
- [ ] 配置日志聚合服务（如 ELK）

---

**最后更新**: 2025-11-04  
**维护者**: GitHub Copilot
