import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BusinessException, ErrorCode } from '../exceptions/business.exception';
import { ConfigService } from '@nestjs/config';
import { detectLocale } from '../i18n/i18n.utils';
import { getI18nConfig } from '../i18n/i18n.config';
import { resolveErrorMessage } from '../i18n/error-messages';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: Record<string, unknown> | undefined;

    const { enabled: i18nEnabled } = getI18nConfig(this.configService);

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const payload = exception.getResponse() as {
        code: ErrorCode;
        message: string;
        details?: Record<string, unknown>;
      };
      code = payload.code;
      message = payload.message;
      details = payload.details;

      if (i18nEnabled && code in ErrorCode) {
        const locale = detectLocale(request, this.configService);
        message = resolveErrorMessage(code as ErrorCode, message, locale);
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const statusLabel = HttpStatus[status];
      if (statusLabel) {
        code = statusLabel;
      }
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (typeof payload === 'object' && payload) {
        message = (payload as any).message || message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 使用 Winston 记录错误日志
    this.logger.error('[Exception Filter]', {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      status,
      message,
      code,
      details,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // 返回统一的错误响应
    response.status(status).json({
      statusCode: status,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
