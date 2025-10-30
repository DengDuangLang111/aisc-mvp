import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 获取配置服务
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;
  const corsOrigin = configService.get<string>('cors.origin') || 'http://localhost:3000';
  const uploadDir = configService.get<string>('upload.destination') || './uploads';
  
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
  
  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Serve uploaded files as static assets
  app.useStaticAssets(join(__dirname, '..', uploadDir), {
    prefix: '/uploads/',
  });
  
  await app.listen(port);
  console.log(`✅ API running at http://localhost:${port}`);
  console.log(`📁 Uploads directory: ${uploadDir}`);
  console.log(`🔐 CORS origin: ${corsOrigin}`);
}
bootstrap();