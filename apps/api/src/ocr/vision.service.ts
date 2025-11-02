import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { PrismaService } from '../prisma/prisma.service';

/**
 * OCR 提取结果
 */
export interface OcrResult {
  fullText: string;
  confidence: number;
  language: string;
  pageCount: number;
  structuredData: any;
}

/**
 * Google Cloud Vision OCR 服务
 * 
 * 功能:
 * - 从 GCS 文件提取文本
 * - 从 Buffer 提取文本
 * - 保存 OCR 结果到数据库
 * - 支持多种文档格式（PDF, 图片等）
 */
@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private client: ImageAnnotatorClient;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const credentials = this.getCredentials();

    this.client = new ImageAnnotatorClient({
      credentials,
    });

    this.logger.log('Google Vision API client initialized');
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
      return require(credentialsPath);
    }

    // 如果都没有，使用默认应用凭据
    return undefined;
  }

  /**
   * 从 GCS 文件提取文本
   * 
   * @param gcsPath - GCS 文件路径（gs://bucket/path/file.ext）
   * @param documentId - 文档 ID（用于保存到数据库）
   * @returns OCR 结果
   */
  async extractTextFromGcs(gcsPath: string, documentId: string): Promise<OcrResult> {
    try {
      this.logger.log(`Starting OCR for document ${documentId}: ${gcsPath}`);

      // 调用 Vision API
      const [result] = await this.client.documentTextDetection(gcsPath);
      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        throw new Error('No text found in document');
      }

      const fullText = fullTextAnnotation.text;
      const pages = fullTextAnnotation.pages || [];
      const pageCount = pages.length;

      // 计算平均置信度
      const confidence = this.calculateConfidence(pages);

      // 检测语言
      const language = this.detectLanguage(pages);

      // 结构化数据（段落、行、词）
      const structuredData = this.extractStructuredData(pages);

      // 保存到数据库
      await this.saveOcrResult(documentId, {
        fullText,
        confidence,
        language,
        pageCount,
        structuredData,
      });

      this.logger.log(`OCR completed for document ${documentId}: ${fullText.length} chars, ${pageCount} pages`);

      return {
        fullText,
        confidence,
        language,
        pageCount,
        structuredData,
      };
    } catch (error) {
      this.logger.error(`OCR failed for document ${documentId}:`, error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * 从文件 Buffer 提取文本
   * 
   * @param fileBuffer - 文件 Buffer
   * @param documentId - 文档 ID
   * @returns OCR 结果
   */
  async extractTextFromBuffer(fileBuffer: Buffer, documentId: string): Promise<OcrResult> {
    try {
      this.logger.log(`Starting OCR from buffer for document ${documentId}`);

      // 调用 Vision API
      const [result] = await this.client.documentTextDetection({
        image: { content: fileBuffer },
      });

      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        throw new Error('No text found in document');
      }

      const fullText = fullTextAnnotation.text;
      const pages = fullTextAnnotation.pages || [];
      const pageCount = pages.length;

      const confidence = this.calculateConfidence(pages);
      const language = this.detectLanguage(pages);
      const structuredData = this.extractStructuredData(pages);

      // 保存到数据库
      await this.saveOcrResult(documentId, {
        fullText,
        confidence,
        language,
        pageCount,
        structuredData,
      });

      this.logger.log(`OCR completed for document ${documentId}: ${fullText.length} chars`);

      return {
        fullText,
        confidence,
        language,
        pageCount,
        structuredData,
      };
    } catch (error) {
      this.logger.error(`OCR failed for document ${documentId}:`, error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * 从数据库获取 OCR 结果
   * 
   * @param documentId - 文档 ID
   * @returns OCR 结果或 null
   */
  async getOcrResult(documentId: string): Promise<OcrResult | null> {
    try {
      const result = await this.prisma.ocrResult.findUnique({
        where: { documentId },
      });

      if (!result) {
        return null;
      }

      return {
        fullText: result.fullText,
        confidence: result.confidence,
        language: result.language,
        pageCount: result.pageCount || 0,
        structuredData: result.structuredData,
      };
    } catch (error) {
      this.logger.error(`Failed to get OCR result for document ${documentId}:`, error);
      return null;
    }
  }

  /**
   * 保存 OCR 结果到数据库
   */
  private async saveOcrResult(documentId: string, result: OcrResult): Promise<void> {
    try {
      await this.prisma.ocrResult.upsert({
        where: { documentId },
        create: {
          documentId,
          fullText: result.fullText,
          confidence: result.confidence,
          language: result.language,
          pageCount: result.pageCount,
          structuredData: result.structuredData,
        },
        update: {
          fullText: result.fullText,
          confidence: result.confidence,
          language: result.language,
          pageCount: result.pageCount,
          structuredData: result.structuredData,
        },
      });

      this.logger.log(`OCR result saved for document ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to save OCR result for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * 计算平均置信度
   */
  private calculateConfidence(pages: any[]): number {
    if (!pages || pages.length === 0) {
      return 0;
    }

    let totalConfidence = 0;
    let wordCount = 0;

    for (const page of pages) {
      if (!page.blocks) continue;

      for (const block of page.blocks) {
        if (!block.paragraphs) continue;

        for (const paragraph of block.paragraphs) {
          if (!paragraph.words) continue;

          for (const word of paragraph.words) {
            if (word.confidence !== undefined) {
              totalConfidence += word.confidence;
              wordCount++;
            }
          }
        }
      }
    }

    return wordCount > 0 ? totalConfidence / wordCount : 0;
  }

  /**
   * 检测文档语言
   */
  private detectLanguage(pages: any[]): string {
    if (!pages || pages.length === 0) {
      return 'unknown';
    }

    const languageCounts: Record<string, number> = {};

    for (const page of pages) {
      if (page.property && page.property.detectedLanguages) {
        for (const lang of page.property.detectedLanguages) {
          const code = lang.languageCode;
          languageCounts[code] = (languageCounts[code] || 0) + 1;
        }
      }
    }

    // 返回最常见的语言
    const languages = Object.entries(languageCounts);
    if (languages.length === 0) {
      return 'unknown';
    }

    languages.sort((a, b) => b[1] - a[1]);
    return languages[0][0];
  }

  /**
   * 提取结构化数据（段落、行、词）
   */
  private extractStructuredData(pages: any[]): any {
    const structuredData = {
      pages: pages.map((page, pageIndex) => ({
        pageNumber: pageIndex + 1,
        width: page.width,
        height: page.height,
        blocks: (page.blocks || []).map((block: any) => ({
          boundingBox: block.boundingBox,
          paragraphs: (block.paragraphs || []).map((paragraph: any) => ({
            text: this.extractText(paragraph.words),
            confidence: paragraph.confidence,
          })),
        })),
      })),
    };

    return structuredData;
  }

  /**
   * 从 words 数组提取文本
   */
  private extractText(words: any[]): string {
    if (!words) return '';

    return words
      .map((word) => {
        if (!word.symbols) return '';
        return word.symbols.map((symbol: any) => symbol.text).join('');
      })
      .join(' ');
  }
}
