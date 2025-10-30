import { IsString, IsArray, MaxLength, IsOptional, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content: string;
}

export class ChatRequestDto {
  @IsString()
  @MaxLength(4000, { message: '消息内容不能超过 4000 字符' })
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversationHistory?: MessageDto[];

  @IsOptional()
  @IsString()
  fileId?: string;
}
