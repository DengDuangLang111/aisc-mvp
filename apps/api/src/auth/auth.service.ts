import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly supabase: SupabaseClient | null;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      process.env.SUPABASE_URL;
    const serviceRoleKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.error(
        'Supabase credentials are missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
      this.supabase = null;
      return;
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * 检查 Supabase 服务可用性
   */
  async getSupabaseHealth() {
    if (!this.supabase) {
      return {
        ok: false,
        error: 'Supabase credentials missing',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const { data } = await this.supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      return {
        ok: true,
        reachable: true,
        sampleUserCount: data?.users?.length ?? 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Supabase error';
      this.logger.error(`Supabase health check failed: ${message}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        ok: false,
        reachable: false,
        error: message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
