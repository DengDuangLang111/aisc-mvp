import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import LokiTransport from 'winston-loki';

export const createLoggerConfig = (
  env: string = process.env.NODE_ENV || 'development',
) => {
  const logLevel = env === 'production' ? 'info' : 'debug';
  const logDir = 'logs';
  const serviceMetadataFormat = winston.format((info) => {
    info.service = 'study-oasis-api';
    info.environment = env;
    info.hostname = info.hostname || process.env.HOSTNAME;
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

  // 错误日志文件（按天轮转）
  const errorFileTransport = new winston.transports.DailyRotateFile({
    filename: `${logDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  });

  // 组合日志文件（按天轮转）
  const combinedFileTransport = new winston.transports.DailyRotateFile({
    filename: `${logDir}/combined-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  // 性能日志文件
  const performanceTransport = new winston.transports.DailyRotateFile({
    filename: `${logDir}/performance-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    maxSize: '20m',
    maxFiles: '7d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  const lokiTransport =
    process.env.LOKI_URL && env !== 'test'
      ? new LokiTransport({
          host: process.env.LOKI_URL,
          labels: { service: 'study-oasis-api', environment: env },
          json: true,
          replaceTimestamp: true,
          interval: 5,
          basicAuth: process.env.LOKI_BASIC_AUTH,
        })
      : null;

  // 开发环境只使用控制台
  const transports =
    env === 'production'
      ? [
          consoleTransport,
          errorFileTransport,
          combinedFileTransport,
          performanceTransport,
          ...(lokiTransport ? [lokiTransport] : []),
        ]
      : [consoleTransport];

  return WinstonModule.createLogger({
    level: logLevel,
    format: winston.format.combine(
      serviceMetadataFormat(),
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports,
    exceptionHandlers:
      env === 'production'
        ? [
            new winston.transports.File({
              filename: `${logDir}/exceptions.log`,
            }),
          ]
        : [],
    rejectionHandlers:
      env === 'production'
        ? [
            new winston.transports.File({
              filename: `${logDir}/rejections.log`,
            }),
          ]
        : [],
  });
};
