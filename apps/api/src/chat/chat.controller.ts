import { Body, Controller, Post, Get, Delete, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBadRequestResponse, 
  ApiTooManyRequestsResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import type { ChatResponse } from '@study-oasis/contracts';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /chat
   * 发送聊天消息
   */
  @Post()
  @ApiOperation({ 
    summary: '发送聊天消息', 
    description: '向 AI 助手发送消息并获取回复。支持对话历史、文档上下文、渐进式提示。'
  })
  @ApiResponse({
    status: 200,
    description: '成功返回 AI 回复',
    schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', example: '这是一个很好的问题！让我们一起思考...' },
        hintLevel: { type: 'number', example: 1, enum: [1, 2, 3] },
        timestamp: { type: 'number', example: 1698765432000 },
        conversationId: { type: 'string', example: 'conv-123' },
        tokensUsed: { type: 'number', example: 150 },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误',
  })
  @ApiTooManyRequestsResponse({
    description: '请求频率超过限制（20次/分钟）',
  })
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponse> {
    return this.chatService.chat(request);
  }

  /**
   * GET /chat/stream
   * 流式聊天（SSE）
   */
  @Get('stream')
  async chatStream(
    @Query('message') message: string,
    @Query('conversationId') conversationId: string,
    @Query('uploadId') uploadId: string,
    @Query('documentId') documentId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      // 构建请求
      const effectiveDocumentId = documentId || uploadId || undefined;

      const request: ChatRequestDto = {
        message,
        conversationId: conversationId || undefined,
        uploadId: uploadId || undefined,
        documentId: effectiveDocumentId,
        conversationHistory: [],
      };

      // 调用流式处理
      await this.chatService.chatStream(request, res);
    } catch (error) {
      console.error('Stream error:', error);
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

  /**
   * GET /chat/conversations
   * 获取对话列表
   */
  @Get('conversations')
  @ApiOperation({
    summary: '获取对话列表',
    description: '获取用户的对话历史列表'
  })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量限制', example: 20 })
  @ApiResponse({
    status: 200,
    description: '对话列表',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          documentId: { type: 'string', nullable: true },
          messageCount: { type: 'number' },
          lastMessage: { type: 'string', nullable: true },
          lastMessageAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getConversations(
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.chatService.getConversations(userId, limitNum);
  }

  /**
   * GET /chat/conversations/:id
   * 获取对话详情
   */
  @Get('conversations/:id')
  @ApiOperation({
    summary: '获取对话详情',
    description: '获取单个对话的完整历史记录'
  })
  @ApiParam({ name: 'id', description: '对话 ID' })
  @ApiResponse({
    status: 200,
    description: '对话详情',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        userId: { type: 'string', nullable: true },
        documentId: { type: 'string', nullable: true },
        document: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            filename: { type: 'string' },
            mimeType: { type: 'string' },
            ocrResult: {
              type: 'object',
              nullable: true,
              properties: {
                confidence: { type: 'number' },
                language: { type: 'string' },
                pageCount: { type: 'number' },
              },
            },
          },
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              role: { type: 'string', enum: ['user', 'assistant'] },
              content: { type: 'string' },
              tokensUsed: { type: 'number', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getConversation(@Param('id') id: string): Promise<any> {
    return this.chatService.getConversation(id);
  }

  /**
   * DELETE /chat/conversations/:id
   * 删除对话
   */
  @Delete('conversations/:id')
  @ApiOperation({
    summary: '删除对话',
    description: '删除指定的对话及其所有消息'
  })
  @ApiParam({ name: 'id', description: '对话 ID' })
  @ApiQuery({ name: 'userId', required: false, description: '用户 ID（用于权限验证）' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Conversation deleted successfully' },
      },
    },
  })
  async deleteConversation(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<{ message: string }> {
    await this.chatService.deleteConversation(id, userId);
    return { message: 'Conversation deleted successfully' };
  }
}
