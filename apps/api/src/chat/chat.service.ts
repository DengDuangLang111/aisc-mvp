import { Injectable, Inject, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import axios from 'axios';

import { VisionService } from '../ocr/vision.service';
import {
  AnalyticsService,
  AnalyticsEventData,
} from '../analytics/analytics.service';
import { EventName, EventCategory } from '../analytics/analytics.types';
import type { ChatResponse, HintLevel } from '@study-oasis/contracts';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import {
  PaginationDto,
  PaginatedResponse,
  createPaginatedResponse,
} from '../common/dto/pagination.dto';
import { ChatPromptBuilder } from './helpers/chat-prompt.builder';
import { ChatMessageHelper } from './helpers/chat-message.helper';
import {
  BusinessException,
  ErrorCode,
} from '../common/exceptions/business.exception';

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
 * 数据库消息类型（匹配实际Prisma返回）
 */
interface DbMessage {
  id: string;
  role: string; // Prisma返回string，不是字面量类型
  content: string;
  tokensUsed: number | null;
  hintLevel: number | null;
  modelUsed: string | null;
  createdAt: Date;
  conversationId: string;
}

/**
 * 带消息的对话类型
 */
interface ConversationWithMessages {
  id: string;
  title: string | null;
  userId: string | null;
  documentId: string | null;
  messages: DbMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 对话列表项类型
 */
interface ConversationListItem {
  id: string;
  title: string | null;
  userId: string | null;
  documentId: string | null;
  _count: {
    messages: number;
  };
  messages: DbMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationSummary {
  id: string;
  title: string | null;
  documentId: string | null;
  messageCount: number;
  lastMessage: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationDetail {
  id: string;
  title: string | null;
  userId: string | null;
  documentId: string | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    tokensUsed: number | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Express 响应流类型
 */
interface ResponseStream {
  write: (data: string) => void;
  end: () => void;
  setHeader: (name: string, value: string) => void;
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
  private readonly DEEPSEEK_API_URL =
    'https://api.deepseek.com/v1/chat/completions';
  private readonly DEEPSEEK_MODEL = 'deepseek-chat';

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
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
    const sessionId = ChatMessageHelper.generateSessionId();

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
        sessionId: sessionId,
        eventName: EventName.CHAT_SESSION_START,
        eventCategory: EventCategory.CHAT,
        eventProperties: {
          conversationId,
          documentId,
          messageLength: message.length,
        },
      });

      // 2. 获取或创建对话
      let conversation: ConversationWithMessages;
      if (conversationId) {
        const existingConv =
          await this.conversationRepo.findById(conversationId);

        if (!existingConv) {
          throw new BusinessException(
            ErrorCode.CONVERSATION_NOT_FOUND,
            `Conversation ${conversationId} not found`,
            HttpStatus.NOT_FOUND,
          );
        }

        // 只获取最近10条消息
        conversation = {
          ...existingConv,
          messages: await this.messageRepo.findLastN(conversationId, 10),
        };
      } else {
        // 创建新对话
        const newConversation = await this.conversationRepo.create({
          userId,
          documentId,
          title: ChatPromptBuilder.generateConversationTitle(message),
        });

        conversation = {
          ...newConversation,
          messages: [],
        };

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
        (msg: DbMessage) => msg.role === 'user',
      ).length;
      const hintLevel = ChatPromptBuilder.calculateHintLevel(userMessageCount);

      // 5. 构建消息历史
      const messageHistory: DeepSeekMessage[] =
        ChatMessageHelper.buildMessageHistory(
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
      const aiResponse = await this.callDeepSeekAPI(
        messageHistory,
        userId,
        sessionId,
      );

      // 8. 保存用户消息到数据库
      await this.messageRepo.create({
        conversationId: conversation.id,
        role: 'user',
        content: message,
      });

      // 9. 保存 AI 回复到数据库
      await this.messageRepo.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.reply,
        tokensUsed: aiResponse.tokensUsed,
      });

      // 10. 记录消息发送成功事件
      await this.trackEvent({
        userId,
        sessionId: sessionId,
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
        sessionId: sessionId,
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
  async getConversations(
    userId?: string,
    pagination: PaginationDto = new PaginationDto(),
  ): Promise<PaginatedResponse<ConversationSummary>> {
    // 获取总数
    const total = await this.conversationRepo.count({ userId });

    // 获取分页数据
    const conversations = await this.conversationRepo.findMany({
      userId,
      limit: pagination.limit || 20,
      offset: pagination.offset || 0,
      orderBy: { updatedAt: 'desc' },
    });

    const data: ConversationSummary[] = conversations.map(
      (conv: ConversationListItem) => ({
        id: conv.id,
        title: conv.title,
        documentId: conv.documentId,
        messageCount: conv._count.messages,
        lastMessage: conv.messages[0]?.content || null,
        lastMessageAt: conv.messages[0]?.createdAt || conv.createdAt,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }),
    );

    return createPaginatedResponse(
      data,
      total,
      pagination.limit || 20,
      pagination.offset || 0,
    );
  }

  /**
   * 获取对话详情（包含所有消息）
   */
  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation) {
      throw new BusinessException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        `Conversation ${conversationId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const conversationDetail: ConversationDetail = {
      id: conversation.id,
      title: conversation.title,
      userId: conversation.userId,
      documentId: conversation.documentId,
      messages: conversation.messages.map((msg: DbMessage) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tokensUsed: msg.tokensUsed,
        createdAt: msg.createdAt,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };

    return conversationDetail;
  }

  /**
   * 删除对话
   */
  async deleteConversation(
    conversationId: string,
    userId?: string,
  ): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);

    if (!conversation) {
      throw new BusinessException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        `Conversation ${conversationId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // 验证用户权限（如果提供了 userId）
    if (userId && conversation.userId !== userId) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED_ACCESS,
        'You do not have permission to delete this conversation',
        HttpStatus.FORBIDDEN,
      );
    }

    // 删除对话（Repository 内部会处理级联删除）
    await this.conversationRepo.delete(conversationId);

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
        reply: ChatPromptBuilder.generateFallbackResponse(
          messages[messages.length - 1].content,
        ),
        tokensUsed: 0,
      };
    }

    try {
      // 记录 API 调用开始
      await this.trackEvent({
        userId,
        sessionId: sessionId!,
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
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000, // 30 秒超时
        },
      );

      const reply = response.data.choices[0].message.content;
      const tokensUsed = response.data.usage.total_tokens;

      // 记录 API 调用成功
      await this.trackEvent({
        userId,
        sessionId: sessionId!,
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
        sessionId: sessionId!,
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
   * 辅助方法：记录事件（不抛出错误）
   */
  private async trackEvent(eventData: AnalyticsEventData): Promise<void> {
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

  /**
   * 流式聊天（SSE）
   * 逐个 token 流式发送响应
   */
  async chatStream(
    request: ChatRequestDto,
    res: ResponseStream,
  ): Promise<void> {
    const { message, conversationId, documentId, userId } = request;
    const sessionId = ChatMessageHelper.generateSessionId();

    try {
      // 1. 获取或创建对话
      let conversation: ConversationWithMessages;
      if (conversationId) {
        const existingConv =
          await this.conversationRepo.findById(conversationId);
        if (!existingConv) {
          res.write(
            `data: ${JSON.stringify({
              token: '',
              error: `Conversation ${conversationId} not found`,
              complete: true,
            })}

`,
          );
          res.end();
          return;
        }

        conversation = {
          ...existingConv,
          messages: await this.messageRepo.findLastN(conversationId, 10),
        };
      } else {
        const newConversation = await this.conversationRepo.create({
          userId,
          documentId,
          title: ChatPromptBuilder.generateConversationTitle(message),
        });

        conversation = {
          ...newConversation,
          messages: [],
        };
      }

      // 2. 加载文档上下文
      let documentContext = '';
      if (documentId || conversation.documentId) {
        const docId = documentId || conversation.documentId;
        const ocrResult = await this.visionService.getOcrResult(docId!);
        if (ocrResult) {
          documentContext = ocrResult.fullText;
        }
      }

      // 3. 计算提示等级
      const userMessageCount = conversation.messages.filter(
        (msg: DbMessage) => msg.role === 'user',
      ).length;
      const hintLevel = ChatPromptBuilder.calculateHintLevel(userMessageCount);

      // 4. 构建消息历史
      const messageHistory: DeepSeekMessage[] =
        ChatMessageHelper.buildMessageHistory(
          conversation.messages,
          documentContext,
          hintLevel,
        );
      messageHistory.push({ role: 'user', content: message });

      // 5. 调用 DeepSeek API（支持流式）
      const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
      if (!apiKey) {
        // Fallback
        const fallbackReply =
          ChatPromptBuilder.generateFallbackResponse(message);
        for (const char of fallbackReply) {
          res.write(
            `data: ${JSON.stringify({
              token: char,
              complete: false,
            })}\n\n`,
          );
          await new Promise((resolve) => setTimeout(resolve, 10)); // 模拟流式延迟
        }
        res.write(`data: ${JSON.stringify({ token: '', complete: true })}\n\n`);
        res.end();
        return;
      }

      try {
        // 调用 DeepSeek streaming API
        const axiosResponse = await axios.post(
          this.DEEPSEEK_API_URL,
          {
            model: this.DEEPSEEK_MODEL,
            messages: messageHistory,
            temperature: 0.7,
            max_tokens: 2000,
            stream: true, // 启用流式输出
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 60000,
            responseType: 'stream',
          },
        );

        let fullReply = '';
        let tokensUsed = 0;

        // 处理流式响应
        await new Promise<void>((resolve, reject) => {
          axiosResponse.data.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const token = parsed.choices?.[0]?.delta?.content || '';
                  if (token) {
                    fullReply += token;
                    res.write(
                      `data: ${JSON.stringify({
                        token,
                        complete: false,
                      })}\n\n`,
                    );
                  }

                  // 从最后一个 chunk 获取 token 使用情况
                  if (parsed.usage) {
                    tokensUsed = parsed.usage.total_tokens || 0;
                  }
                } catch (e) {
                  this.logger.error('Failed to parse stream data', {
                    context: 'ChatService.chatStream',
                    error: e instanceof Error ? e.message : String(e),
                    stack: e instanceof Error ? e.stack : undefined,
                  });
                }
              }
            }
          });

          axiosResponse.data.on('end', () => {
            // 保存消息和完成信号
            this.messageRepo
              .create({
                conversationId: conversation.id,
                role: 'user',
                content: message,
              })
              .catch((err) => {
                this.logger.error('Failed to save user message', {
                  context: 'ChatService.chatStream',
                  error: err instanceof Error ? err.message : String(err),
                  conversationId: conversation.id,
                });
              });

            this.messageRepo
              .create({
                conversationId: conversation.id,
                role: 'assistant',
                content: fullReply,
                tokensUsed,
              })
              .catch((err) => {
                this.logger.error('Failed to save assistant message', {
                  context: 'ChatService.chatStream',
                  error: err instanceof Error ? err.message : String(err),
                  conversationId: conversation.id,
                  tokensUsed,
                });
              });

            res.write(
              `data: ${JSON.stringify({
                token: '',
                complete: true,
                conversationId: conversation.id,
              })}\n\n`,
            );
            res.end();
            resolve();
          });

          axiosResponse.data.on('error', (error: Error) => {
            reject(error);
          });
        });
      } catch (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Stream error occurred', {
        context: 'ChatService.chatStream',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.write(
        `data: ${JSON.stringify({
          token: '',
          error: error.message,
          complete: true,
        })}\n\n`,
      );
      res.end();
    }
  }
}
