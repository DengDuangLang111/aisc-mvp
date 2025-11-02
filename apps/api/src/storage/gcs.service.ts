import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Google Cloud Storage 上传结果
 */
export interface GcsUploadResult {
  gcsPath: string; // gs://bucket-name/folder/file.ext
  publicUrl: string; // 公开访问 URL
  filename: string;
  bucket: string;
}

/**
 * Google Cloud Storage 服务
 * 
 * 功能:
 * - 文件上传到 GCS
 * - 生成预签名 URL（临时访问）
 * - 文件删除
 * - 文件列表查询
 */
@Injectable()
export class GcsService {
  private readonly logger = new Logger(GcsService.name);
  private storage: Storage;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const credentials = this.getCredentials();
    
    this.storage = new Storage({
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID'),
      credentials,
    });

    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || 'study-oasis-uploads';
    this.logger.log(`GCS Service initialized with bucket: ${this.bucketName}`);
  }

  /**
   * 获取 Google 认证凭据
   */
  private getCredentials(): any {
    // 优先使用 Base64 编码的凭据（Railway 部署）
    const base64Creds = this.configService.get<string>('GOOGLE_CREDENTIALS_BASE64');
    if (base64Creds) {
      try {
        const decoded = Buffer.from(base64Creds, 'base64').toString('utf-8');
        return JSON.parse(decoded);
      } catch (error) {
        this.logger.error('Failed to parse GOOGLE_CREDENTIALS_BASE64', error);
      }
    }

    // 否则使用文件路径
    const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
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
            this.logger.debug(`Loading credentials from ${tryPath}`);
            const fileContent = fs.readFileSync(tryPath, 'utf-8');
            return JSON.parse(fileContent);
          }
        }
        
        this.logger.warn(`Credentials file not found in any of the paths: ${pathsToTry.join(', ')}`);
      } catch (error) {
        this.logger.error('Failed to load credentials from file', error);
      }
    }

    // 如果都没有，使用默认应用凭据（本地开发时通过 gcloud auth）
    return undefined;
  }

  /**
   * 上传文件到 GCS
   * 
   * @param file - 文件 Buffer
   * @param originalFilename - 原始文件名
   * @param folder - 存储文件夹（默认：'uploads'）
   * @returns GCS 路径和公开 URL
   */
  async uploadFile(
    file: Buffer,
    originalFilename: string,
    folder: string = 'uploads',
  ): Promise<GcsUploadResult> {
    try {
      const ext = path.extname(originalFilename);
      const filename = `${uuidv4()}${ext}`;
      const gcsPath = `${folder}/${filename}`;

      const bucket = this.storage.bucket(this.bucketName);
      const fileObj = bucket.file(gcsPath);

      // 上传文件
      await fileObj.save(file, {
        metadata: {
          contentType: this.getMimeType(ext),
          metadata: {
            originalFilename,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // 生成 signed URL（7天有效 - GCS 最大限制）
      const gcsFullPath = `gs://${this.bucketName}/${gcsPath}`;
      const publicUrl = await this.getSignedUrl(gcsFullPath, 7);

      this.logger.log(`File uploaded successfully: ${gcsPath}`);

      return {
        gcsPath: gcsFullPath,
        publicUrl,
        filename,
        bucket: this.bucketName,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${originalFilename}`, error);
      throw new Error(`GCS upload failed: ${error.message}`);
    }
  }

  /**
   * 生成预签名 URL（临时访问链接，默认 7 天有效）
   * 
   * @param gcsPath - GCS 路径（gs://bucket/path/file.ext 或 path/file.ext）
   * @param expiresInDays - 有效期（天）
   * @returns 预签名 URL
   */
  async getSignedUrl(gcsPath: string, expiresInDays: number = 7): Promise<string> {
    try {
      // 移除 gs://bucket/ 前缀
      const filePath = gcsPath.replace(`gs://${this.bucketName}/`, '');

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
      });

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for: ${gcsPath}`, error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * 删除文件
   * 
   * @param gcsPath - GCS 路径
   */
  async deleteFile(gcsPath: string): Promise<void> {
    try {
      const filePath = gcsPath.replace(`gs://${this.bucketName}/`, '');
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);

      await file.delete();
      this.logger.log(`File deleted successfully: ${gcsPath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${gcsPath}`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * 列出文件夹下的所有文件
   * 
   * @param folder - 文件夹路径
   * @returns 文件列表
   */
  async listFiles(folder: string = 'uploads'): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({ prefix: folder });

      return files.map((file) => `gs://${this.bucketName}/${file.name}`);
    } catch (error) {
      this.logger.error(`Failed to list files in folder: ${folder}`, error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * 检查文件是否存在
   * 
   * @param gcsPath - GCS 路径
   * @returns 是否存在
   */
  async fileExists(gcsPath: string): Promise<boolean> {
    try {
      const filePath = gcsPath.replace(`gs://${this.bucketName}/`, '');
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);

      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Failed to check file existence: ${gcsPath}`, error);
      return false;
    }
  }

  /**
   * 根据扩展名获取 MIME 类型
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}
