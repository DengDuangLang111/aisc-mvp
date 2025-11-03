/**
 * 前端结构化日志工具
 * 支持环境感知的日志级别控制和性能追踪
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: unknown;
}

interface PerformanceMetrics {
  duration: number;
  timestamp: number;
  memory?: {
    used: number;
    total: number;
  };
}

class Logger {
  private level: LogLevel;
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    // 生产环境默认INFO级别，开发环境DEBUG级别
    this.level = this.environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * DEBUG级别日志（仅开发环境）
   */
  debug(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * INFO级别日志
   */
  info(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * WARN级别日志
   */
  warn(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  /**
   * ERROR级别日志
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.level <= LogLevel.ERROR) {
      const errorDetails = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
      
      console.error(`[ERROR] ${message}`, {
        error: errorDetails,
        ...context,
      });
    }
  }

  /**
   * 性能日志（始终记录）
   */
  perf(label: string, metrics: PerformanceMetrics): void {
    console.log(`[PERF] ${label}`, {
      duration: `${metrics.duration.toFixed(2)}ms`,
      timestamp: new Date(metrics.timestamp).toISOString(),
      memory: metrics.memory,
    });
  }

  /**
   * HTTP请求日志
   */
  http(method: string, url: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
    const logMethod = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    
    console[logMethod](`[HTTP] ${method} ${url} - ${status}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...context,
    });
  }

  /**
   * 用户行为分析日志
   */
  analytics(event: string, properties?: LogContext): void {
    if (this.environment === 'production') {
      // 生产环境可以集成真实的分析服务（如Google Analytics、Mixpanel等）
      console.log(`[ANALYTICS] ${event}`, properties || '');
    } else {
      console.log(`[ANALYTICS] ${event}`, properties || '');
    }
  }
}

/**
 * 性能追踪类
 */
export class PerformanceLogger {
  private startTime: number;
  private startMemory?: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
    
    // 浏览器环境中的内存监控
    if (typeof window !== 'undefined' && (performance as any).memory) {
      this.startMemory = (performance as any).memory.usedJSHeapSize;
    }
  }

  /**
   * 结束追踪并记录日志
   */
  end(): PerformanceMetrics {
    const duration = performance.now() - this.startTime;
    const metrics: PerformanceMetrics = {
      duration,
      timestamp: Date.now(),
    };

    if (this.startMemory !== undefined && (performance as any).memory) {
      const endMemory = (performance as any).memory.usedJSHeapSize;
      metrics.memory = {
        used: endMemory - this.startMemory,
        total: (performance as any).memory.totalJSHeapSize,
      };
    }

    logger.perf(this.label, metrics);
    return metrics;
  }
}

/**
 * 全局单例Logger实例
 */
export const logger = new Logger();

/**
 * 性能测量工具函数
 */
export function measurePerformance<T>(label: string, fn: () => T): T {
  const perf = new PerformanceLogger(label);
  try {
    const result = fn();
    perf.end();
    return result;
  } catch (error) {
    perf.end();
    throw error;
  }
}

/**
 * 异步性能测量工具函数
 */
export async function measurePerformanceAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const perf = new PerformanceLogger(label);
  try {
    const result = await fn();
    perf.end();
    return result;
  } catch (error) {
    perf.end();
    throw error;
  }
}
