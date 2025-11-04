import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn('⚠️  Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // 性能监控采样率
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // 性能分析采样率
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // 集成
    integrations: [nodeProfilingIntegration(), Sentry.httpIntegration()],

    // 忽略某些错误
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'Request aborted',
      'AbortError',
      'ECONNRESET',
      'ETIMEDOUT',
    ],

    // 过滤敏感信息
    beforeSend(event, hint) {
      // 移除敏感请求信息
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }

      // 移除敏感用户信息
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      return event;
    },

    // 附加标签
    initialScope: {
      tags: {
        service: 'study-oasis-api',
        version: process.env.npm_package_version || '1.0.0',
      },
    },
  });

  console.log('✅ Sentry initialized');
}
