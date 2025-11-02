import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { VisionService } from '../ocr/vision.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { EventName, EventCategory } from '../analytics/analytics.types';
import type { ChatResponse, HintLevel } from '@study-oasis/contracts';
import { ChatRequestDto } from './dto/chat-request.dto';

/**
 * DeepSeek API 响应类型
 */
interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  id: string;
  choices: Array<{
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * ChatService - 重构版
 * 
 * 新增功能：
 * 1. 对话历史持久化（conversations, messages 表）
 * 2. 文档上下文集成（从 OCR 结果读取）
 * 3. 真实 AI API 调用（DeepSeek）
 * 4. 事件追踪（对话开始、消息发送、提示请求）
 * 5. 对话历史查询 API
 */
@Injectable()
export class ChatService {
  private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private readonly DEEPSEEK_MODEL = 'deepseek-chat';

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly visionService: VisionService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * 处理聊天请求（重构版）
   * 
   * 流程：
   * 1. 创建或获取对话
   * 2. 加载文档上下文（如果有 documentId）
   * 3. 构建提示词（系统提示 + 文档上下文 + 对话历史）
   * 4. 调用 DeepSeek API
   * 5. 保存消息到数据库
   * 6. 记录事件
   */
  async chat(request: ChatRequestDto): Promise<ChatResponse> {
    const { message, conversationId, documentId, userId } = request;
    const sessionId = this.generateSessionId();

    this.logger.log('info', 'Processing chat request', {
      context: 'ChatService',
      messageLength: message.length,
      conversationId,
      documentId,
      userId,
    });

    try {
      // 1. 记录对话开始事件
      await this.trackEvent({
        userId,
        sessionId,
        eventName: EventName.CHAT_SESSION_START,
        eventCategory: EventCategory.CHAT,
        eventProperties: {
          conversationId,
          documentId,
          messageLength: message.length,
        },
      });

      // 2. 获取或创建对话
      let conversation;
      if (conversationId) {
        conversation = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 10 } },
        });

        if (!conversation) {
          throw new NotFoundException(`Conversation ${conversationId} not found`);
        }
      } else {
        // 创建新对话
        conversation = await this.prisma.conversation.create({
          data: {
            userId,
            documentId,
            title: this.generateConversationTitle(message),
          },
          include: { messages: true },
        });

        this.logger.log('info', 'Created new conversation', {
          context: 'ChatService',
          conversationId: conversation.id,
        });
      }

      // 3. 加载文档上下文（如果有）
      let documentContext = '';
      if (documentId || conversation.documentId) {
        const docId = documentId || conversation.documentId;
        const ocrResult = await this.visionService.getOcrResult(docId!);
        
        if (ocrResult) {
          documentContext = ocrResult.fullText;
          this.logger.log('info', 'Loaded document context', {
            context: 'ChatService',
            documentId: docId,
            contextLength: documentContext.length,
          });
        }
      }

      // 4. 计算提示等级（基于对话轮次）
      const userMessageCount = conversation.messages.filter(
        (msg: any) => msg.role === 'user',
      ).length;
      const hintLevel = this.calculateHintLevel(userMessageCount);

      // 5. 构建消息历史
      const messageHistory: DeepSeekMessage[] = this.buildMessageHistory(
        conversation.messages,
        documentContext,
        hintLevel,
      );

      // 6. 添加当前用户消息
      messageHistory.push({
        role: 'user',
        content: message,
      });

      // 7. 调用 DeepSeek API
      const aiResponse = await this.callDeepSeekAPI(messageHistory, userId, sessionId);

      // 8. 保存用户消息到数据库
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: message,
        },
      });

      // 9. 保存 AI 回复到数据库
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: aiResponse.reply,
          tokensUsed: aiResponse.tokensUsed,
        },
      });

      // 10. 记录消息发送成功事件
      await this.trackEvent({
        userId,
        sessionId,
        eventName: EventName.CHAT_MESSAGE_SENT,
        eventCategory: EventCategory.CHAT,
        eventProperties: {
          conversationId: conversation.id,
          hintLevel,
          tokensUsed: aiResponse.tokensUsed,
          hasDocumentContext: !!documentContext,
        },
      });

      return {
        reply: aiResponse.reply,
        hintLevel,
        timestamp: Date.now(),
        conversationId: conversation.id,
        tokensUsed: aiResponse.tokensUsed,
      };
    } catch (error) {
      this.logger.error('Chat request failed', {
        context: 'ChatService',
        error: error.message,
        stack: error.stack,
      });

      // 记录失败事件
      await this.trackEvent({
        userId,
        sessionId,
        eventName: EventName.CHAT_MESSAGE_FAILED,
        eventCategory: EventCategory.CHAT,
        eventProperties: {
          error: error.message,
          conversationId,
        },
      });

      throw error;
    }
  }

  /**
   * 获取对话历史
   */
  async getConversations(userId?: string, limit: number = 20): Promise<any[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: userId ? { userId } : undefined,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // 只取最后一条消息用于预览
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return conversations.map((conv: any) => ({
      id: conv.id,
      title: conv.title,
      documentId: conv.documentId,
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0]?.content || null,
      lastMessageAt: conv.messages[0]?.createdAt || conv.createdAt,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));
  }

  /**
   * 获取对话详情（包含所有消息）
   */
  async getConversation(conversationId: string): Promise<any> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        document: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            ocrResult: {
              select: {
                confidence: true,
                language: true,
                pageCount: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      userId: conversation.userId,
      documentId: conversation.documentId,
      document: conversation.document,
      messages: conversation.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tokensUsed: msg.tokensUsed,
        createdAt: msg.createdAt,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string, userId?: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // 验证用户权限（如果提供了 userId）
    if (userId && conversation.userId !== userId) {
      throw new BadRequestException('Unauthorized to delete this conversation');
    }

    // 删除对话（会级联删除关联的 messages）
    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    this.logger.log('info', 'Conversation deleted', {
      context: 'ChatService',
      conversationId,
    });
  }

  /**
   * 调用 DeepSeek API
   */
  private async callDeepSeekAPI(
    messages: DeepSeekMessage[],
    userId?: string,
    sessionId?: string,
  ): Promise<{ reply: string; tokensUsed: number }> {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');

    if (!apiKey) {
      this.logger.warn('DeepSeek API key not configured, using fallback', {
        context: 'ChatService',
      });
      
      // Fallback: 返回硬编码回复
      return {
        reply: this.generateFallbackResponse(messages[messages.length - 1].content),
        tokensUsed: 0,
      };
    }

    try {
      // 记录 API 调用开始
      await this.trackEvent({
        userId,
        sessionId,
        eventName: EventName.DEEPSEEK_API_CALL_START,
        eventCategory: EventCategory.SYSTEM,
        eventProperties: {
          messageCount: messages.length,
        },
      });

      const response = await axios.post<DeepSeekResponse>(
        this.DEEPSEEK_API_URL,
        {
          model: this.DEEPSEEK_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          timeout: 30000, // 30 秒超时
        },
      );

      const reply = response.data.choices[0].message.content;
      const tokensUsed = response.data.usage.total_tokens;

      // 记录 API 调用成功
      await this.trackEvent({
        userId,
        sessionId,
        eventName: EventName.DEEPSEEK_API_CALL_SUCCESS,
        eventCategory: EventCategory.SYSTEM,
        eventProperties: {
          tokensUsed,
          model: this.DEEPSEEK_MODEL,
        },
      });

      this.logger.log('info', 'DeepSeek API call successful', {
        context: 'ChatService',
        tokensUsed,
        replyLength: reply.length,
      });

      return { reply, tokensUsed };
    } catch (error) {
      this.logger.error('DeepSeek API call failed', {
        context: 'ChatService',
        error: error.message,
        stack: error.stack,
      });

      // 记录 API 调用失败
      await this.trackEvent({
        userId,
        sessionId,
        eventName: EventName.DEEPSEEK_API_CALL_FAILED,
        eventCategory: EventCategory.SYSTEM,
        eventProperties: {
          error: error.message,
        },
      });

      // Fallback: 返回友好的错误信息
      return {
        reply: '抱歉，AI 服务暂时不可用。我会尽快恢复！请稍后再试。',
        tokensUsed: 0,
      };
    }
  }

  /**
   * 构建消息历史（包含系统提示和文档上下文）
   */
  private buildMessageHistory(
    dbMessages: any[],
    documentContext: string,
    hintLevel: HintLevel,
  ): DeepSeekMessage[] {
    const messages: DeepSeekMessage[] = [];

    // 1. 系统提示（根据 hintLevel 调整）
    const systemPrompt = this.buildSystemPrompt(hintLevel, !!documentContext);
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // 2. 文档上下文（如果有）
    if (documentContext) {
      messages.push({
        role: 'system',
        content: `以下是用户上传的文档内容，请基于此内容回答用户的问题：\n\n${documentContext.slice(0, 4000)}`, // 限制长度
      });
    }

      // 3. 历史消息（最近 10 条）
      dbMessages.slice(-10).forEach((msg: any) => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });    return messages;
  }

  /**
   * 构建系统提示（根据提示等级）
   */
  private buildSystemPrompt(hintLevel: HintLevel, hasDocument: boolean): string {
    const basePrompt = hasDocument
      ? '你是一个智能学习助手，帮助学生理解文档内容。'
      : '你是一个智能学习助手，帮助学生解决学习问题。';

    const hintPrompts = {
      1: `${basePrompt}\n\n**提示策略（Level 1 - 轻微提示）**：\n- 只给出方向性的指引，不要给出具体答案\n- 引导学生思考问题的关键概念\n- 鼓励学生自己探索和推理\n- 使用提问的方式激发思考`,
      2: `${basePrompt}\n\n**提示策略（Level 2 - 中等提示）**：\n- 提供清晰的思路和步骤\n- 可以给出部分解题方法或公式\n- 但不要直接给出完整答案\n- 鼓励学生尝试应用你提供的方法`,
      3: `${basePrompt}\n\n**提示策略（Level 3 - 详细提示）**：\n- 提供详细的分析和解题步骤\n- 可以接近答案，但仍然留给学生最后一步\n- 解释每个步骤的原理\n- 确保学生理解而不是直接抄答案`,
    };

    return hintPrompts[hintLevel];
  }

  /**
   * 生成对话标题（从第一条消息提取）
   */
  private generateConversationTitle(message: string): string {
    // 取前 50 个字符作为标题
    const title = message.slice(0, 50);
    return title.length < message.length ? `${title}...` : title;
  }

  /**
   * 计算提示等级（根据对话轮次）
   */
  private calculateHintLevel(userMessageCount: number): HintLevel {
    if (userMessageCount <= 1) return 1;
    if (userMessageCount <= 3) return 2;
    return 3;
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 辅助方法：记录事件（不抛出错误）
   */
  private async trackEvent(eventData: any): Promise<void> {
    try {
      await this.analyticsService.trackEvent(eventData);
    } catch (error) {
      this.logger.warn('Failed to track event', {
        context: 'ChatService',
        error: error.message,
      });
    }
  }

  /**
   * Fallback 回复（当 API 不可用时）
   */
  private generateFallbackResponse(message: string): string {
    return `🤔 感谢你的提问！由于 AI 服务暂时不可用，这里是一些通用建议：

1. **理解问题**：确保你完全理解了问题要求
2. **寻找关键概念**：识别问题中的核心概念和术语
3. **回顾相关知识**：复习与问题相关的基础知识
4. **尝试分解问题**：将复杂问题分解为更小的子问题
5. **使用资源**：查阅教科书、笔记或在线资源

如果你继续遇到困难，请稍后再试，我的 AI 功能应该会恢复。💪`;
  }
}
