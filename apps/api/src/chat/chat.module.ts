import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OcrModule } from '../ocr/ocr.module';
import { AnalyticsModule } from '../analytics/analytics.module';

/**
 * ChatModule - 重构版
 * 
 * 依赖模块：
 * - PrismaModule: 数据库操作（conversations, messages 表）
 * - OcrModule: 获取 OCR 文档上下文
 * - AnalyticsModule: 事件追踪
 */
@Module({
  imports: [PrismaModule, OcrModule, AnalyticsModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
