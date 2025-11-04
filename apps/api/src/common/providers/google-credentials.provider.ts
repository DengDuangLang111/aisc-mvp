import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Google Cloud 认证提供者
 *
 * 统一管理 Google Cloud 服务（Vision API, Storage）的认证凭据
 * 支持多种认证方式：
 * 1. Base64 编码的环境变量（Railway 部署）
 * 2. 文件路径（本地开发）
 * 3. 默认应用凭据（gcloud auth）
 */
@Injectable()
export class GoogleCredentialsProvider {
  private readonly logger = new Logger(GoogleCredentialsProvider.name);
  private credentials: any;

  constructor(private configService: ConfigService) {
    this.credentials = this.loadCredentials();
  }

  /**
   * 获取 Google 认证凭据
   */
  getCredentials(): any {
    return this.credentials;
  }

  /**
   * 获取项目 ID
   */
  getProjectId(): string | undefined {
    return this.credentials?.project_id;
  }

  /**
   * 获取客户端邮箱
   */
  getClientEmail(): string | undefined {
    return this.credentials?.client_email;
  }

  /**
   * 加载凭据
   */
  private loadCredentials(): any {
    // 方法 1: Base64 编码的凭据（Railway 部署）
    const base64Creds = this.configService.get<string>(
      'GOOGLE_CREDENTIALS_BASE64',
    );
    if (base64Creds) {
      try {
        const decoded = Buffer.from(base64Creds, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        this.logger.log('Loaded credentials from GOOGLE_CREDENTIALS_BASE64');
        return parsed;
      } catch (error) {
        this.logger.error('Failed to parse GOOGLE_CREDENTIALS_BASE64', error);
      }
    }

    // 方法 2: 文件路径
    const credentialsPath = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
    );
    if (credentialsPath) {
      try {
        // 尝试多个可能的路径
        const pathsToTry = [
          credentialsPath, // 直接使用提供的路径
          path.join(process.cwd(), credentialsPath), // 相对于当前工作目录
          path.join(__dirname, '../../..', credentialsPath), // 相对于源文件
          path.join(process.cwd(), 'apps/api', credentialsPath), // 相对于根目录的 apps/api
        ];

        for (const tryPath of pathsToTry) {
          if (fs.existsSync(tryPath)) {
            this.logger.log(`Loading credentials from ${tryPath}`);
            const fileContent = fs.readFileSync(tryPath, 'utf-8');
            return JSON.parse(fileContent);
          }
        }

        this.logger.warn(
          `Credentials file not found in any of the paths: ${pathsToTry.join(', ')}`,
        );
      } catch (error) {
        this.logger.error('Failed to load credentials from file', error);
      }
    }

    // 方法 3: 使用默认应用凭据（本地开发时通过 gcloud auth）
    this.logger.log('Using default application credentials');
    return undefined;
  }

  /**
   * 验证凭据是否有效
   */
  validateCredentials(): boolean {
    if (!this.credentials) {
      return true; // 默认凭据可能可用
    }

    const required = ['project_id', 'private_key', 'client_email'];
    const missing = required.filter((key) => !this.credentials[key]);

    if (missing.length > 0) {
      this.logger.error(
        `Missing required credential fields: ${missing.join(', ')}`,
      );
      return false;
    }

    return true;
  }

  /**
   * 重新加载凭据（用于凭据更新后）
   */
  reloadCredentials(): void {
    this.logger.log('Reloading Google credentials');
    this.credentials = this.loadCredentials();
  }
}
