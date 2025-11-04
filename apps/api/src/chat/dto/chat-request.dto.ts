import {
  IsString,
  IsArray,
  MaxLength,
  IsOptional,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MessageDto {
  @ApiProperty({
    description: '消息角色',
    enum: ['user', 'assistant'],
    example: 'user',
  })
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({
    description: '消息内容',
    maxLength: 4000,
    example: '什么是递归？',
  })
  @IsString()
  @MaxLength(4000)
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({
    description: '用户发送的消息内容',
    maxLength: 4000,
    example: '请解释一下什么是递归？',
  })
  @IsString()
  @MaxLength(4000, { message: '消息内容不能超过 4000 字符' })
  message: string;

  @ApiPropertyOptional({
    description: '对话历史记录，用于保持上下文连贯性',
    type: [MessageDto],
    example: [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好！有什么我可以帮助你的吗？' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversationHistory?: MessageDto[];

  @ApiPropertyOptional({
    description: '关联的上传文件 ID（如果是针对特定文件的提问）',
    example: 'a84da51f-6291-48de-9c33-d9dd1658cc0e',
  })
  @IsOptional()
  @IsString()
  uploadId?: string;

  @ApiPropertyOptional({
    description: '用户 ID',
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: '对话 ID（继续现有对话）',
    example: 'conv-123',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: '文档 ID（基于文档对话）',
    example: 'doc-123',
  })
  @IsOptional()
  @IsString()
  documentId?: string;
}
