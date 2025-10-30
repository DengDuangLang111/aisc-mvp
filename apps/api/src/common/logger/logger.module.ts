import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const env = configService.get<string>('NODE_ENV') || 'development';
        const logLevel = configService.get<string>('logging.level') || 'info';

        // 日志格式
        const logFormat = winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.json(),
        );

        // 控制台输出格式（开发环境更友好）
        const consoleFormat = winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            let msg = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
            
            // 如果有额外的元数据，添加到日志中
            if (Object.keys(meta).length > 0) {
              msg += ` ${JSON.stringify(meta)}`;
            }
            
            return msg;
          }),
        );

        // 日志传输配置
        const transports: winston.transport[] = [
          // 控制台输出
          new winston.transports.Console({
            format: env === 'production' ? logFormat : consoleFormat,
          }),
        ];

        // 生产环境添加文件日志
        if (env === 'production') {
          transports.push(
            // 错误日志
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: logFormat,
              maxsize: 5242880, // 5MB
              maxFiles: 5,
            }),
            // 组合日志
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: logFormat,
              maxsize: 5242880, // 5MB
              maxFiles: 10,
            }),
          );
        }

        return {
          level: logLevel,
          format: logFormat,
          transports,
          exitOnError: false,
        };
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
