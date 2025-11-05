import { IsString, IsOptional, IsInt, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFocusSessionDto {
  @ApiPropertyOptional({ description: '文档 ID' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({ description: '对话 ID' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export enum FocusSessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export class UpdateFocusSessionDto {
  @ApiPropertyOptional({ enum: FocusSessionStatus, description: '会话状态' })
  @IsOptional()
  @IsEnum(FocusSessionStatus)
  status?: FocusSessionStatus;

  @ApiPropertyOptional({ description: '暂停次数' })
  @IsOptional()
  @IsInt()
  pauseCount?: number;

  @ApiPropertyOptional({ description: '提问次数' })
  @IsOptional()
  @IsInt()
  questionsAsked?: number;

  @ApiPropertyOptional({ description: '活跃时长（秒）' })
  @IsOptional()
  @IsInt()
  activeDuration?: number;

  @ApiPropertyOptional({ description: '完成证明 ID' })
  @IsOptional()
  @IsString()
  completionProofId?: string;
}

export enum DistractionType {
  TAB_SWITCH = 'tab_switch',
  WINDOW_BLUR = 'window_blur',
  MOUSE_LEAVE = 'mouse_leave',
  NAVIGATION_ATTEMPT = 'navigation_attempt',
}

export class LogDistractionDto {
  @ApiProperty({ enum: DistractionType, description: '干扰类型' })
  @IsEnum(DistractionType)
  type: DistractionType;

  @ApiPropertyOptional({ description: '干扰持续时间（秒）' })
  @IsOptional()
  @IsInt()
  duration?: number;
}

export interface FocusSessionAnalytics {
  sessionId: string;
  userId: string | null;
  startTime: Date;
  endTime: Date | null;
  totalDuration: number;
  activeDuration: number;
  distractionTime: number;
  focusScore: number;
  status: string;
  metrics: {
    totalDistractions: number;
    tabSwitches: number;
    pauses: number;
    questionsAsked: number;
    distractionsByType: Record<string, number>;
  };
  grade: string;
  insights: string[];
}
