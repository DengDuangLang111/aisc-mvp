import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { GamificationService } from './gamification.service';
import { Request } from 'express';

@ApiTags('gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('progress')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: '获取用户的游戏化进度',
    description: '返回当日/历史 streak、平均焦点分数、徽章与近期会话列表。',
  })
  @ApiResponse({
    status: 200,
    description: '当前用户的 gamification 进度',
  })
  async getProgress(@Req() req: Request) {
    const userId = req.user!.sub;
    return this.gamificationService.getUserProgress(userId);
  }
}
