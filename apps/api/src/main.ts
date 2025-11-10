import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import compression from 'compression';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { initSentry } from './config/sentry.config';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';

async function bootstrap() {
  // 初始化 Sentry（在应用创建之前）
  initSentry();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 获取配置服务和日志服务
  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_PROVIDER);
  const port = configService.get<number>('port') || 4000;
  const corsOrigin =
    configService.get<string>('cors.origin') || 'http://localhost:3000';
  const uploadDir =
    configService.get<string>('upload.destination') || './uploads';

  // 启用压缩中间件 (gzip/deflate)
  app.use(
    compression({
      threshold: 1024, // 只压缩大于 1KB 的响应
      level: 6, // 压缩级别 (0-9, 6 是平衡点)
    }),
  );

  // 配置 CORS
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 去除未定义的属性
      forbidNonWhitelisted: true, // 拒绝未定义的属性
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 应用 Sentry 拦截器（生产环境）
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    app.useGlobalInterceptors(new SentryInterceptor());
  }

  // Serve uploaded files as static assets
  const uploadsPath = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads',
  });

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Study Oasis API')
    .setDescription(
      'AI 学习助手 API 文档，覆盖上传、聊天、专注、通知、游戏化、监控等模块',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access token (`Authorization: Bearer <token>`)',
      },
      'JWT',
    )
    .addTag('auth', 'Authentication & session diagnostics')
    .addTag('chat', 'AI conversations and streaming replies')
    .addTag('upload', 'Document upload & OCR pipeline')
    .addTag('ocr', 'Vision OCR callbacks and utilities')
    .addTag('focus', 'Focus session tracking & analytics')
    .addTag('analytics', 'Usage metrics, costs, and insights')
    .addTag('gamification', 'Streaks, badges, and retention nudges')
    .addTag('notifications', 'Cross-app reminder banners')
    .addTag('health', 'Health checks & platform diagnostics')
    .addServer('http://localhost:4000', '本地开发环境')
    .addServer('http://localhost:3001', '备用端口')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Study Oasis API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  await app.listen(port);

  // 使用 Winston 记录启动信息
  logger.log('info', '✅ API Server Started Successfully', {
    port,
    uploadDir,
    corsOrigin,
    environment: configService.get('nodeEnv'),
    swaggerDocs: `http://localhost:${port}/api-docs`,
    timestamp: new Date().toISOString(),
  });
}

bootstrap();
