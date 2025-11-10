import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { NotificationsService } from './notifications.service';
import { Request } from 'express';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('banners')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: '获取提醒横幅',
    description: '返回 streak/专注/证明等提醒，方便前端在header或layout展示。',
  })
  @ApiResponse({
    status: 200,
    description: '可显示的提醒列表',
  })
  async getBanners(@Req() req: Request) {
    const userId = (req.user as any)?.sub;
    return this.notificationsService.getReminderBanners(userId);
  }
}
