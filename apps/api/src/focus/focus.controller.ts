import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FocusService } from './focus.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import {
  CreateFocusSessionDto,
  UpdateFocusSessionDto,
  LogDistractionDto,
} from './dto';

@ApiTags('focus')
@Controller('focus')
export class FocusController {
  constructor(private readonly focusService: FocusService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '创建新的专注会话（需要认证）' })
  @ApiResponse({ status: 201, description: '会话创建成功' })
  async createSession(
    @Body() createDto: CreateFocusSessionDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.sub;
    return this.focusService.createSession(
      userId,
      createDto.documentId,
      createDto.conversationId,
    );
  }

  @Put('sessions/:id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '更新专注会话状态（需要认证）' })
  @ApiResponse({ status: 200, description: '会话更新成功' })
  async updateSession(
    @Param('id') sessionId: string,
    @Body() updateDto: UpdateFocusSessionDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.sub;
    return this.focusService.updateSession(sessionId, updateDto, userId);
  }

  @Post('sessions/:id/distractions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '记录干扰事件（需要认证）' })
  @ApiResponse({ status: 201, description: '干扰记录成功' })
  async logDistraction(
    @Param('id') sessionId: string,
    @Body() distractionDto: LogDistractionDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.sub;
    return this.focusService.logDistraction(sessionId, distractionDto, userId);
  }

  @Post('sessions/:id/complete')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '完成专注会话（需要认证）' })
  @ApiResponse({ status: 200, description: '会话完成' })
  async completeSession(
    @Req() req: Request,
    @Param('id') sessionId: string,
    @Body('completionProofId') completionProofId?: string,
  ) {
    const userId = (req.user as any)?.sub;
    return this.focusService.updateSession(
      sessionId,
      {
        status: 'completed' as any,
        completionProofId,
      },
      userId,
    );
  }

  @Get('sessions/:id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '获取会话详情（需要认证）' })
  @ApiResponse({ status: 200, description: '返回会话详情' })
  async getSession(@Param('id') sessionId: string, @Req() req: Request) {
    const userId = (req.user as any)?.sub;
    return this.focusService.getSession(sessionId, userId);
  }

  @Get('sessions/:id/analytics')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '获取会话分析报告（需要认证）' })
  @ApiResponse({ status: 200, description: '返回会话分析数据' })
  async getSessionAnalytics(@Param('id') sessionId: string, @Req() req: Request) {
    const userId = (req.user as any)?.sub;
    return this.focusService.getSessionAnalytics(sessionId, userId);
  }

  @Get('sessions')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '获取用户的会话列表（需要认证）' })
  @ApiResponse({ status: 200, description: '返回会话列表' })
  async getUserSessions(
    @Req() req: Request,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: string,
  ) {
    const userId = (req.user as any)?.sub;
    return this.focusService.getUserSessions(userId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      status,
    });
  }
}
