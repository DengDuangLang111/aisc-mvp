import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCredentialsProvider } from '../common/providers/google-credentials.provider';

/**
 * OCR 提取结果
 */
export interface OcrResult {
  fullText: string;
  confidence: number;
  language: string;
  pageCount: number;
}


/**
 * Google Cloud Storage 文件对象
 */
interface GcsFile {
  delete: () => Promise<void>;
}

/**
 * Google Vision API Symbol 类型
 */
interface VisionSymbol {
  text: string;
  confidence?: number;
}

/**
 * Google Vision API Word 类型
 */
interface VisionWord {
  symbols?: VisionSymbol[] | null;
  confidence?: number;
}

/**
 * Google Vision API Paragraph 类型
 */
interface VisionParagraph {
  words?: VisionWord[] | null;
  confidence?: number;
}

/**
 * Google Vision API Block 类型
 */
interface VisionBlock {
  paragraphs?: VisionParagraph[] | null;
  boundingBox?: unknown;
}

/**
 * Google Vision API Page 类型
 */
interface VisionPage {
  blocks?: VisionBlock[] | null;
  width?: number;
  height?: number;
  confidence?: number;
  property?: {
    detectedLanguages?: Array<{ languageCode: string }>;
  };
}

/**
 * 结构化数据 - Block
 */
interface StructuredBlock {
  boundingBox: unknown;
  paragraphs: Array<{
    text: string;
    confidence?: number;
  }>;
}

/**
 * 结构化数据 - Page
 */
interface StructuredPage {
  pageNumber: number;
  width?: number;
  height?: number;
  blocks: StructuredBlock[];
}

/**
 * 结构化数据结果
 */
interface StructuredData {
  pages: StructuredPage[];
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
    private googleCredentialsProvider: GoogleCredentialsProvider,
  ) {
    const credentials = this.googleCredentialsProvider.getCredentials();

    this.client = new ImageAnnotatorClient({
      credentials,
    });

    this.logger.log('Google Vision API client initialized');
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

      // 检查是否是 PDF 文件
      const isPdf = gcsPath.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // PDF 需要使用异步批处理 API
        return await this.extractPdfFromGcs(gcsPath, documentId);
      }

      // 图片文件使用同步 API
      const [result] = await this.client.documentTextDetection(gcsPath);
      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        throw new Error('No text found in document');
      }

      const fullText = fullTextAnnotation.text;
      const pages = fullTextAnnotation.pages || [];
      const pageCount = pages.length || 1;

      const confidence = this.calculateConfidence(pages as VisionPage[]);
      const language = this.detectLanguage(pages as VisionPage[]);

      // 保存到数据库
      await this.saveOcrResult(documentId, {
        fullText,
        confidence,
        language,
        pageCount,
      });

      this.logger.log(`OCR completed for document ${documentId}: ${fullText.length} chars, ${pageCount} pages`);

      return {
        fullText,
        confidence,
        language,
        pageCount,
      };
    } catch (error) {
      this.logger.error(`OCR failed for document ${documentId}:`, error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * 从 GCS 的 PDF 文件提取文本（使用异步 API）
   */
  private async extractPdfFromGcs(gcsPath: string, documentId: string): Promise<OcrResult> {
    try {
      this.logger.log(`Starting async PDF OCR for document ${documentId}: ${gcsPath}`);

      // 提取 bucket 和路径
      const gcsMatch = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
      if (!gcsMatch) {
        throw new Error('Invalid GCS path format');
      }

      const bucketName = gcsMatch[1];
      const fileName = gcsMatch[2];
      const outputPrefix = `ocr-output/${documentId}/`;

      // 使用异步批处理 API
      const [operation] = await this.client.asyncBatchAnnotateFiles({
        requests: [
          {
            inputConfig: {
              gcsSource: {
                uri: gcsPath,
              },
              mimeType: 'application/pdf',
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            outputConfig: {
              gcsDestination: {
                uri: `gs://${bucketName}/${outputPrefix}`,
              },
              batchSize: 1,
            },
          },
        ],
      });

      this.logger.log(`Waiting for PDF OCR operation to complete for document ${documentId}`);

      // 等待操作完成（最多等待 5 分钟）
      const [result] = await operation.promise();

      this.logger.log(`PDF OCR operation completed for document ${documentId}`);

      // 从 GCS 读取结果
      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage({
        keyFilename: this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS') || './google-cloud-key.json',
      });

      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix: outputPrefix });

      if (!files || files.length === 0) {
        throw new Error('No OCR output files found');
      }

      // 读取第一个输出文件
      const [content] = await files[0].download();
      const outputJson = JSON.parse(content.toString());

      // 提取文本
      let fullText = '';
      let totalPages = 0;
      let totalConfidence = 0;
      let confidenceCount = 0;

      for (const response of outputJson.responses) {
        if (response.fullTextAnnotation) {
          fullText += response.fullTextAnnotation.text + '\n';
          const pages = response.fullTextAnnotation.pages || [];
          totalPages += pages.length;

          // 计算置信度
          for (const page of pages) {
            if (page.confidence) {
              totalConfidence += page.confidence;
              confidenceCount++;
            }
          }
        }
      }

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('No text found in PDF');
      }

      const confidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.9;
      const language = this.detectLanguageFromText(fullText);
      const pageCount = totalPages || 1;

      // 保存到数据库
      await this.saveOcrResult(documentId, {
        fullText: fullText.trim(),
        confidence,
        language,
        pageCount,
      });

      // 清理临时文件
      try {
        await Promise.all(files.map((file: GcsFile) => file.delete()));
        this.logger.log(`Cleaned up OCR output files for document ${documentId}`);
      } catch (cleanupError) {
        this.logger.warn(`Failed to cleanup OCR output files: ${cleanupError.message}`);
      }

      this.logger.log(`PDF OCR completed for document ${documentId}: ${fullText.length} chars, ${pageCount} pages`);

      return {
        fullText: fullText.trim(),
        confidence,
        language,
        pageCount,
      };
    } catch (error) {
      this.logger.error(`PDF OCR failed for document ${documentId}:`, error);
      throw new Error(`PDF OCR failed: ${error.message}`);
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

      const confidence = this.calculateConfidence(pages as VisionPage[]);
      const language = this.detectLanguage(pages as VisionPage[]);

      // 保存到数据库
      await this.saveOcrResult(documentId, {
        fullText,
        confidence,
        language,
        pageCount,
      });

      this.logger.log(`OCR completed for document ${documentId}: ${fullText.length} chars`);

      return {
        fullText,
        confidence,
        language,
        pageCount,
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
        },
        update: {
          fullText: result.fullText,
          confidence: result.confidence,
          language: result.language,
          pageCount: result.pageCount,
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
  private calculateConfidence(pages: VisionPage[]): number {
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
  private detectLanguage(pages: VisionPage[]): string {
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
   * 从文本内容检测语言（简单版本）
   */
  private detectLanguageFromText(text: string): string {
    if (!text || text.trim().length === 0) {
      return 'unknown';
    }

    // 简单的语言检测：检查中文字符
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
    if (chineseChars && chineseChars.length > text.length * 0.3) {
      return 'zh'; // 中文
    }

    // 检查日文
    const japaneseChars = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g);
    if (japaneseChars && japaneseChars.length > text.length * 0.1) {
      return 'ja'; // 日文
    }

    // 默认为英文
    return 'en';
  }

  /**
   * 提取结构化数据（段落、行、词）
   */
  private extractStructuredData(pages: VisionPage[]): StructuredData {
    const structuredData = {
      pages: pages.map((page, pageIndex) => ({
        pageNumber: pageIndex + 1,
        width: page.width,
        height: page.height,
        blocks: (page.blocks || []).map((block: VisionBlock) => ({
          boundingBox: block.boundingBox,
          paragraphs: (block.paragraphs || []).map((paragraph: VisionParagraph) => ({
            text: this.extractText(paragraph.words || []),
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
  private extractText(words: VisionWord[]): string {
    if (!words) return '';

    return words
      .map((word) => {
        if (!word.symbols) return '';
        return word.symbols.map((symbol: VisionSymbol) => symbol.text).join('');
      })
      .join(' ');
  }
}
