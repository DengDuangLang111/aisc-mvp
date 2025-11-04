import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OcrModule } from '../ocr/ocr.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';

/**
 * ChatModule - 重构版
 *
 * 依赖模块：
 * - PrismaModule: 数据库操作（conversations, messages 表）
 * - OcrModule: 获取 OCR 文档上下文
 * - AnalyticsModule: 事件追踪
 *
 * Repositories:
 * - ConversationRepository: 对话数据访问层
 * - MessageRepository: 消息数据访问层
 */
@Module({
  imports: [PrismaModule, OcrModule, AnalyticsModule],
  controllers: [ChatController],
  providers: [ChatService, ConversationRepository, MessageRepository],
  exports: [ChatService, ConversationRepository, MessageRepository],
})
export class ChatModule {}
