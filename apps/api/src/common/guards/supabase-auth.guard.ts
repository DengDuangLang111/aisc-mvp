import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase JWT 验证 Guard
 * 从请求的 Authorization header 提取 token，验证其有效性
 * 将用户信息注入到 req.user（包含 userId、email 等）
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly supabaseUrl = process.env.SUPABASE_URL;
  private readonly supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  private readonly supabase: SupabaseClient | null;

  constructor() {
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      this.logger.error(
        'Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
      this.supabase = null;
    } else {
      this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No token provided in Authorization header');
      throw new UnauthorizedException('Missing authorization token');
    }

    if (!this.supabase) {
      throw new UnauthorizedException('Authentication service not available');
    }

    try {
      // 调用 Supabase Auth 验证 token，有效则返回用户信息
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data?.user) {
        this.logger.warn(`Failed to verify token: ${error?.message}`);
        throw new UnauthorizedException('Invalid or expired token');
      }

      const user = data.user;

      // 将经过 Supabase 验证的用户信息注入请求，供后续 handler 使用
      request.user = {
        sub: user.id, // Supabase user id
        email: user.email,
        ...user,
      };

      this.logger.debug(`User authenticated: ${user.id}`);
      return true;
    } catch (err) {
      this.logger.error(`Authentication error: ${err}`);
      throw new UnauthorizedException('Failed to authenticate');
    }
  }

  /**
   * 从 "Bearer <token>" 格式的 header 中提取 token
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      this.logger.warn('Invalid authorization header format');
      return null;
    }

    return parts[1];
  }

}

/**
 * 扩展 Express Request 类型以包含 user 属性
 * 在 types.d.ts 或 types 文件中添加以下声明：
 * 
 * declare namespace Express {
 *   interface Request {
 *     user?: {
 *       sub: string;
 *       email?: string;
 *       [key: string]: any;
 *     };
 *   }
 * }
 */
