import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import axios from 'axios';
import * as fs from 'fs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCredentialsProvider } from '../common/providers/google-credentials.provider';
import { withExternalCall } from '../common/utils/external-call.util';
import { BusinessException, ErrorCode } from '../common/exceptions/business.exception';

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

interface PageContent {
  pageNumber: number;
  content: string;
}

export interface DocumentContextRecord {
  fullText?: string;
  summary?: string | null;
  faq?: DocumentFaqItem[];
  pages: PageContent[];
}

export interface DocumentFaqItem {
  question: string;
  answer: string;
  pages?: number[];
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
  private readonly insightModel: string;
  private readonly deepSeekApiUrl = 'https://api.deepseek.com/v1/chat/completions';
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
    this.insightModel =
      this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat';

    this.logger.log('Google Vision API client initialized');
  }

  /**
   * 从 GCS 文件提取文本
   *
   * @param gcsPath - GCS 文件路径（gs://bucket/path/file.ext）
   * @param documentId - 文档 ID（用于保存到数据库）
   * @returns OCR 结果
   */
  async extractTextFromGcs(
    gcsPath: string,
    documentId: string,
  ): Promise<OcrResult> {
    try {
      this.logger.log(`Starting OCR for document ${documentId}: ${gcsPath}`);

      // 检查是否是 PDF 文件
      const isPdf = gcsPath.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // PDF 需要使用异步批处理 API
        return await this.extractPdfFromGcs(gcsPath, documentId);
      }

      // 图片文件使用同步 API
      const [result] = await withExternalCall(
        () => this.client.documentTextDetection(gcsPath),
        {
          logger: this.logger,
          context: 'VISION_OCR_GCS',
          resource: gcsPath,
        },
      );
      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        throw new Error('No text found in document');
      }

      const fullText = fullTextAnnotation.text;
      const pages = (fullTextAnnotation.pages || []) as VisionPage[];
      const pageContents = this.buildPageContents(pages);
      const pageCount = pageContents.length || pages.length || 1;

      const confidence = this.calculateConfidence(pages);
      const language = this.detectLanguage(pages);

      await this.persistOcrArtifacts(documentId, {
        fullText,
        confidence,
        language,
        pageCount,
        pages: pageContents,
      });

      this.logger.log(
        `OCR completed for document ${documentId}: ${fullText.length} chars, ${pageCount} pages`,
      );

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

  private async saveOcrPages(
    documentId: string,
    pages: PageContent[],
  ): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.ocrPage.deleteMany({ where: { documentId } }),
        ...(pages.length
          ? [
              this.prisma.ocrPage.createMany({
                data: pages.map((page) => ({
                  documentId,
                  pageNumber: page.pageNumber,
                  content: page.content,
                })),
              }),
            ]
          : []),
      ]);

      this.logger.log(
        `OCR page slices saved for document ${documentId}: ${pages.length}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to persist OCR pages for document ${documentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 从 GCS 的 PDF 文件提取文本（使用异步 API）
   */
  private async extractPdfFromGcs(
    gcsPath: string,
    documentId: string,
  ): Promise<OcrResult> {
    try {
      this.logger.log(
        `Starting async PDF OCR for document ${documentId}: ${gcsPath}`,
      );

      // 提取 bucket 和路径
      const gcsMatch = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
      if (!gcsMatch) {
        throw new Error('Invalid GCS path format');
      }

      const bucketName = gcsMatch[1];
      const fileName = gcsMatch[2];
      const outputPrefix = `ocr-output/${documentId}/`;

      // 使用异步批处理 API
      const [operation] = await withExternalCall(
        () =>
          this.client.asyncBatchAnnotateFiles({
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
      }),
        {
          logger: this.logger,
          context: 'VISION_OCR_PDF',
          resource: gcsPath,
        },
      );

      this.logger.log(
        `Waiting for PDF OCR operation to complete for document ${documentId}`,
      );

      // 等待操作完成（最多等待 5 分钟）
      const [result] = await operation.promise();

      this.logger.log(`PDF OCR operation completed for document ${documentId}`);

      // 从 GCS 读取结果
      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage({
        keyFilename:
          this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS') ||
          './google-cloud-key.json',
      });

      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix: outputPrefix });

      if (!files || files.length === 0) {
        throw new Error('No OCR output files found');
      }

      const sortedFiles = files
        .slice()
        .sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name),
        );

      let fullText = '';
      let totalPages = 0;
      let totalConfidence = 0;
      let confidenceCount = 0;
      const pageContents: PageContent[] = [];
      let nextPageNumber = 1;

      for (const file of sortedFiles) {
        const contentResult = await withExternalCall(
          () => file.download(),
          {
            logger: this.logger,
            context: 'VISION_OCR_PDF_DOWNLOAD',
            resource: file.name,
          },
        );
        const [content] = contentResult as [Buffer];
        const outputJson = JSON.parse(content.toString());

        for (const response of outputJson.responses || []) {
          if (!response.fullTextAnnotation) {
            continue;
          }

          if (response.fullTextAnnotation.text) {
            fullText += response.fullTextAnnotation.text.trim() + '\n';
          }

          const pages = (response.fullTextAnnotation.pages ||
            []) as VisionPage[];
          totalPages += pages.length;

          for (const page of pages) {
            if (page.confidence) {
              totalConfidence += page.confidence;
              confidenceCount++;
            }

            const pageText = this.extractPageText(page);
            pageContents.push({
              pageNumber: nextPageNumber++,
              content: pageText || response.fullTextAnnotation.text || '',
            });
          }
        }
      }

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('No text found in PDF');
      }

      const confidence =
        confidenceCount > 0 ? totalConfidence / confidenceCount : 0.9;
      const language = this.detectLanguageFromText(fullText);
      const pageCount = pageContents.length || totalPages || 1;

      await this.persistOcrArtifacts(documentId, {
        fullText: fullText.trim(),
        confidence,
        language,
        pageCount,
        pages: pageContents,
      });

      // 清理临时文件
      try {
        await Promise.all(files.map((file: GcsFile) => file.delete()));
        this.logger.log(
          `Cleaned up OCR output files for document ${documentId}`,
        );
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to cleanup OCR output files: ${cleanupError.message}`,
        );
      }

      this.logger.log(
        `PDF OCR completed for document ${documentId}: ${fullText.length} chars, ${pageCount} pages`,
      );

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
  async extractTextFromBuffer(
    fileBuffer: Buffer,
    documentId: string,
  ): Promise<OcrResult> {
    try {
      this.logger.log(`Starting OCR from buffer for document ${documentId}`);

      // 调用 Vision API
      const [result] = await withExternalCall(
        () =>
          this.client.documentTextDetection({
            image: { content: fileBuffer },
          }),
        {
          logger: this.logger,
          context: 'VISION_OCR_BUFFER',
          resource: documentId,
        },
      );

      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        throw new Error('No text found in document');
      }

      const fullText = fullTextAnnotation.text;
      const pages = (fullTextAnnotation.pages || []) as VisionPage[];
      const pageContents = this.buildPageContents(pages);
      const pageCount = pageContents.length || pages.length || 1;

      const confidence = this.calculateConfidence(pages);
      const language = this.detectLanguage(pages);

      await this.persistOcrArtifacts(documentId, {
        fullText,
        confidence,
        language,
        pageCount,
        pages: pageContents,
      });

      this.logger.log(
        `OCR completed for document ${documentId}: ${fullText.length} chars`,
      );

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
      this.logger.error(
        `Failed to get OCR result for document ${documentId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * 获取完整的文档上下文（全文、分页面、洞察）
   */
  async getDocumentContext(
    documentId: string,
  ): Promise<DocumentContextRecord | null> {
    const [ocrResult, pages, insight] = await Promise.all([
      this.prisma.ocrResult.findUnique({
        where: { documentId },
      }),
      this.prisma.ocrPage.findMany({
        where: { documentId },
        orderBy: { pageNumber: 'asc' },
      }),
      this.prisma.documentInsight.findUnique({
        where: { documentId },
      }),
    ]);

    if (!ocrResult && pages.length === 0 && !insight) {
      return null;
    }

    return {
      fullText: ocrResult?.fullText,
      summary: insight?.summary ?? null,
      faq: this.normalizeFaq(insight?.faq),
      pages: pages.map((page) => ({
        pageNumber: page.pageNumber,
        content: page.content,
      })),
    };
  }

  /**
   * 保存 OCR 结果到数据库
   */
  private async saveOcrResult(
    documentId: string,
    result: OcrResult,
  ): Promise<void> {
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
      this.logger.error(
        `Failed to save OCR result for document ${documentId}:`,
        error,
      );
      throw error;
    }
  }

  private async persistOcrArtifacts(
    documentId: string,
    result: OcrResult & { pages?: PageContent[] },
  ): Promise<void> {
    const normalizedPages = result.pages ?? [];

    await this.saveOcrResult(documentId, {
      fullText: result.fullText,
      confidence: result.confidence,
      language: result.language,
      pageCount: normalizedPages.length || result.pageCount,
    });

    await this.saveOcrPages(documentId, normalizedPages);

    if (!result.fullText) {
      return;
    }

    try {
      await this.generateDocumentInsights(
        documentId,
        result.fullText,
        normalizedPages,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to generate document insights for ${documentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private buildPageContents(pages: VisionPage[]): PageContent[] {
    if (!pages || pages.length === 0) {
      return [];
    }

    return pages.map((page, index) => ({
      pageNumber: index + 1,
      content: this.extractPageText(page),
    }));
  }

  private extractPageText(page: VisionPage): string {
    if (!page.blocks || page.blocks.length === 0) {
      return '';
    }

    const blockTexts = (page.blocks || []).map((block: VisionBlock) => {
      const paragraphTexts = (block.paragraphs || []).map(
        (paragraph: VisionParagraph) =>
          this.extractText(paragraph.words || []).trim(),
      );
      return paragraphTexts.filter(Boolean).join('\n');
    });

    return blockTexts.filter(Boolean).join('\n\n').trim();
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
          paragraphs: (block.paragraphs || []).map(
            (paragraph: VisionParagraph) => ({
              text: this.extractText(paragraph.words || []),
              confidence: paragraph.confidence,
            }),
          ),
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

  private normalizeFaq(
    faqValue: Prisma.JsonValue | null | undefined,
  ): DocumentFaqItem[] {
    if (!faqValue || !Array.isArray(faqValue)) {
      return [];
    }

    const items: DocumentFaqItem[] = [];

    for (const raw of faqValue) {
      if (
        !raw ||
        typeof raw !== 'object' ||
        !('question' in raw) ||
        !('answer' in raw)
      ) {
        continue;
      }

      const question = String((raw as Record<string, unknown>).question || '')
        .trim()
        .slice(0, 300);
      const answer = String((raw as Record<string, unknown>).answer || '')
        .trim()
        .slice(0, 800);

      if (!question || !answer) {
        continue;
      }

      let pages: number[] | undefined;
      const rawPages = (raw as Record<string, unknown>).pages;
      if (Array.isArray(rawPages)) {
        pages = rawPages
          .map((page) => Number(page))
          .filter((page) => Number.isInteger(page) && page > 0);
        if (pages.length === 0) {
          pages = undefined;
        }
      }

      items.push({ question, answer, pages });
    }

    return items;
  }

  private async generateDocumentInsights(
    documentId: string,
    fullText: string,
    pages: PageContent[],
  ): Promise<void> {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        `DEEPSEEK_API_KEY is not configured, skip insight generation for ${documentId}`,
      );
      return;
    }

    const normalized = fullText.trim();
    if (normalized.length < 40) {
      this.logger.debug('Document too short for insights, skipping', {
        documentId,
      });
      return;
    }

    const excerpt = normalized.slice(0, 9000);
    const pageHints =
      pages.length > 0
        ? pages
            .slice(0, 10)
            .map(
              (page) =>
                `第${page.pageNumber}页: ${page.content
                  .replace(/\s+/g, ' ')
                  .slice(0, 240)}`,
            )
            .join('\n')
        : '（无分页内容）';

    const prompt = `你是一个文档理解助手。请阅读以下 OCR 文本和按页摘要，输出 JSON，必须包含：
{
  "summary": "用中文写的200字以内的摘要",
  "faq": [
    {
      "question": "用户可能会问的问题",
      "answer": "基于文档的回答，必要时引用页码",
      "pages": [1,2]
    }
  ]
}

如果无法提取 FAQ，则返回空数组。`;

    try {
      const response = await axios.post(
        this.deepSeekApiUrl,
        {
          model: this.insightModel,
          messages: [
            { role: 'system', content: prompt },
            {
              role: 'user',
              content: `文档节选：
${excerpt}

分页线索：
${pageHints}`,
            },
          ],
          temperature: 0.4,
          max_tokens: 1200,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        },
      );

      const rawContent =
        response.data?.choices?.[0]?.message?.content?.trim() || '';
      if (!rawContent) {
        this.logger.warn('Insight response empty', { documentId });
        return;
      }

      const { summary, faq } = this.parseInsightResponse(rawContent, documentId);

      if (!summary && faq.length === 0) {
        return;
      }

      const faqPayload: Prisma.InputJsonValue =
        faq.length > 0
          ? ((faq as unknown) as Prisma.InputJsonValue)
          : ((Prisma.JsonNull as unknown) as Prisma.InputJsonValue);

      await this.prisma.documentInsight.upsert({
        where: { documentId },
        create: {
          documentId,
          summary,
          faq: faqPayload,
        },
        update: {
          summary,
          faq: faqPayload,
        },
      });

      this.logger.log('Document insights updated', {
        documentId,
        faqCount: faq.length,
      });
    } catch (error) {
      this.logger.warn('Failed to call DeepSeek for document insights', {
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private parseInsightResponse(
    content: string,
    documentId: string,
  ): { summary: string | null; faq: DocumentFaqItem[] } {
    let normalized = content.trim();
    const codeBlockMatch = normalized.match(/```json([\s\S]*?)```/i);
    if (codeBlockMatch) {
      normalized = codeBlockMatch[1];
    }

    try {
      const parsed = JSON.parse(normalized);
      const summary =
        typeof parsed.summary === 'string'
          ? parsed.summary.trim().slice(0, 1200)
          : null;

      const faqItems: DocumentFaqItem[] = [];
      if (Array.isArray(parsed.faq)) {
        for (const raw of parsed.faq) {
          if (
            !raw ||
            typeof raw !== 'object' ||
            !('question' in raw) ||
            !('answer' in raw)
          ) {
            continue;
          }

          const question = String(
            (raw as Record<string, unknown>).question || '',
          )
            .trim()
            .slice(0, 300);
          const answer = String(
            (raw as Record<string, unknown>).answer || '',
          )
            .trim()
            .slice(0, 1200);

          if (!question || !answer) continue;

          let pages: number[] | undefined;
          const rawPages = (raw as Record<string, unknown>).pages;
          if (Array.isArray(rawPages)) {
            pages = rawPages
              .map((page) => Number(page))
              .filter((page) => Number.isInteger(page) && page > 0);
            if (pages.length === 0) {
              pages = undefined;
            }
          }

          faqItems.push({ question, answer, pages });
        }
      }

      return { summary, faq: faqItems };
    } catch (error) {
      this.logger.warn('Failed to parse insight JSON', {
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { summary: null, faq: [] };
    }
  }
}
