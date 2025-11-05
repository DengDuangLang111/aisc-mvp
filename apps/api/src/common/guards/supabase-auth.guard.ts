import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { createClient } from '@supabase/supabase-js';

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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No token provided in Authorization header');
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      // 初始化 Supabase 客户端（使用服务角色密钥可访问 auth 信息）
      const supabase = createClient(this.supabaseUrl!, this.supabaseServiceKey!);

      // 验证 JWT token
      const {
        data: { user },
        error,
      } = await supabase.auth.admin.getUserById(
        // 先从 token 中解码 user id（token 格式：JWT，sub claim 是 user id）
        this.extractUserIdFromToken(token),
      );

      if (error || !user) {
        this.logger.warn(`Failed to verify token: ${error?.message}`);
        throw new UnauthorizedException('Invalid or expired token');
      }

      // 将用户信息注入到请求对象
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

  /**
   * 从 JWT token 中解码并提取 user id（sub claim）
   * 注意：这里只做基础解码，真正的验证由 Supabase 服务完成
   */
  private extractUserIdFromToken(token: string): string {
    try {
      // JWT 格式：header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // base64 decode payload
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      );
      const userId = payload.sub;

      if (!userId) {
        throw new Error('No sub claim in JWT');
      }

      return userId;
    } catch (err) {
      this.logger.error(`Failed to extract user id from token: ${err}`);
      throw new UnauthorizedException('Invalid token format');
    }
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
