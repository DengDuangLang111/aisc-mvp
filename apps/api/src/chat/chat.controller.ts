import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import type { ChatResponse } from './chat.types';
import { ChatRequestDto } from './dto/chat-request.dto';

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
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponse> {
    return this.chatService.chat(request);
  }
}
