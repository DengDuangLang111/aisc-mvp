import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ example: 'Hello, how can I help you?' })
  reply: string;

  @ApiProperty({ example: 1, description: 'Hint level (1-3)' })
  hintLevel: number;

  @ApiProperty({ example: 1698765432000 })
  timestamp: number;

  @ApiProperty({ example: 'conv-123' })
  conversationId: string;

  @ApiProperty({ example: 150, required: false })
  tokensUsed?: number;
}

export class DeleteConversationResponseDto {
  @ApiProperty({ example: 'Conversation deleted successfully' })
  message: string;
}
