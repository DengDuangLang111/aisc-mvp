import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import type { ChatRequest, ChatResponse } from './chat.types';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /chat
   * 处理用户的聊天请求
   */
  @Post()
  async chat(@Body() request: ChatRequest): Promise<ChatResponse> {
    return this.chatService.chat(request);
  }
}
