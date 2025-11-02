import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import type { ChatResponse } from './chat.types';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /chat
   * 处理用户的聊天请求
   * Rate Limit: 20 requests per 60 seconds (全局配置)
   */
  @Post()
  @ApiOperation({ 
    summary: '发送聊天消息', 
    description: '向 AI 助手发送消息并获取回复。支持三种提示级别：1-直接答案，2-引导提示，3-苏格拉底式提问。'
  })
  @ApiResponse({
    status: 200,
    description: '成功返回 AI 回复',
    schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', example: '这是一个很好的问题！让我们一起思考...' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '请求参数错误（消息为空、提示级别无效等）',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '消息不能为空' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiTooManyRequestsResponse({
    description: '请求频率超过限制（20次/分钟）',
  })
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponse> {
    return this.chatService.chat(request);
  }
}
