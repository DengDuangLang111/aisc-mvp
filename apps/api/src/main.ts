import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import compression from 'compression';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 获取配置服务和日志服务
  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_PROVIDER);
  const port = configService.get<number>('port') || 4000;
  const corsOrigin = configService.get<string>('cors.origin') || 'http://localhost:3000';
  const uploadDir = configService.get<string>('upload.destination') || './uploads';
  
  // 启用压缩中间件 (gzip/deflate)
  app.use(compression({
    threshold: 1024, // 只压缩大于 1KB 的响应
    level: 6, // 压缩级别 (0-9, 6 是平衡点)
  }));
  
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
  
  // Serve uploaded files as static assets
  app.useStaticAssets(join(__dirname, '..', uploadDir), {
    prefix: '/uploads/',
  });
  
  await app.listen(port);
  
  // 使用 Winston 记录启动信息
  logger.log('info', '✅ API Server Started Successfully', {
    port,
    uploadDir,
    corsOrigin,
    environment: configService.get('nodeEnv'),
    timestamp: new Date().toISOString(),
  });
}
bootstrap();