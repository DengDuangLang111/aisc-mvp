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
  private readonly ocrCounter: promClient.Counter;

  constructor() {
    this.register = new promClient.Registry();

    // 启用默认指标（CPU、内存等）
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'study_oasis_',
    });

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
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // 活跃连接
    this.activeConnections = new promClient.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    // 聊天请求计数
    this.chatRequestCounter = new promClient.Counter({
      name: 'chat_requests_total',
      help: 'Total number of chat requests',
      labelNames: ['hint_level', 'streaming'],
      registers: [this.register],
    });

    // 文件上传计数
    this.uploadCounter = new promClient.Counter({
      name: 'file_uploads_total',
      help: 'Total number of file uploads',
      labelNames: ['file_type', 'success'],
      registers: [this.register],
    });

    // OCR 请求计数
    this.ocrCounter = new promClient.Counter({
      name: 'ocr_requests_total',
      help: 'Total number of OCR requests',
      labelNames: ['success'],
      registers: [this.register],
    });
  }

  onModuleInit() {
    console.log('✅ Metrics service initialized');
  }

  // 记录 HTTP 请求
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ) {
    this.httpRequestCounter.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });

    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode.toString(),
      },
      duration,
    );
  }

  // 记录聊天请求
  recordChatRequest(hintLevel: number, streaming: boolean = false) {
    this.chatRequestCounter.inc({
      hint_level: hintLevel.toString(),
      streaming: streaming.toString(),
    });
  }

  // 记录文件上传
  recordFileUpload(fileType: string, success: boolean = true) {
    this.uploadCounter.inc({
      file_type: fileType,
      success: success.toString(),
    });
  }

  // 记录 OCR 请求
  recordOcrRequest(success: boolean = true) {
    this.ocrCounter.inc({
      success: success.toString(),
    });
  }

  // 更新活跃连接数
  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  // 增加活跃连接
  incrementActiveConnections() {
    this.activeConnections.inc();
  }

  // 减少活跃连接
  decrementActiveConnections() {
    this.activeConnections.dec();
  }

  // 获取所有指标
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  // 获取指标的内容类型
  getContentType(): string {
    return this.register.contentType;
  }
}
