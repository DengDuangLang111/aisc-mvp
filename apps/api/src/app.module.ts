import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { OcrModule } from './ocr/ocr.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LoggerModule } from './common/logger/logger.module';
import { CommonModule } from './common/common.module';
import { MetricsModule } from './metrics/metrics.module';
import { AlertModule } from './alerts/alert.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpCacheInterceptor } from './common/interceptors/cache.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import configuration from './config/configuration';
import { validate } from './config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate,
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('rateLimit.ttl') || 60000,
          limit: configService.get<number>('rateLimit.limit') || 20,
        },
      ],
    }),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('cache.ttl') || 60000,
        max: configService.get<number>('cache.max') || 100,
        isGlobal: true,
      }),
    }),
    LoggerModule,
    CommonModule,
    PrismaModule,
    StorageModule,
    OcrModule,
    AnalyticsModule,
    MetricsModule,
    AlertModule,
    UploadModule,
    ChatModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
