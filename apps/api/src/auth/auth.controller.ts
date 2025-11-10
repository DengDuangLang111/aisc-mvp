import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Supabase 诊断',
    description:
      '检查 Supabase 凭证是否配置正确，并验证服务端是否可以访问 Supabase Auth。',
  })
  @ApiResponse({
    status: 200,
    description: '返回 Supabase 连接状态',
  })
  async getSupabaseHealth() {
    return this.authService.getSupabaseHealth();
  }

  @Get('session')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: '获取当前用户会话',
    description:
      '通过 Supabase JWT 验证后返回当前用户的基础信息，可用于 SSR 同步和前端调试。',
  })
  @ApiResponse({
    status: 200,
    description: '返回会话信息',
  })
  getSession(@Req() req: Request) {
    const user = req.user as Record<string, any>;
    return {
      user: {
        id: user?.sub,
        email: user?.email,
        aud: user?.aud,
        role: user?.role,
        appMetadata: user?.app_metadata,
        userMetadata: user?.user_metadata,
      },
      issuedAt: new Date().toISOString(),
    };
  }
}
