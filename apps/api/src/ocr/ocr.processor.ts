import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { VisionService } from './vision.service';
import { DocumentRepository } from '../upload/repositories/document.repository';

export interface OcrJobData {
  documentId: string;
  gcsPath?: string | null;
  localPath?: string | null;
  userId?: string;
}

@Processor('ocr')
export class OcrProcessor {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly visionService: VisionService,
    private readonly documentRepository: DocumentRepository,
  ) {}

  @Process('extract-text')
  async handleExtractText(job: Job<OcrJobData>): Promise<void> {
    const { documentId, gcsPath, localPath } = job.data;

    this.logger.log(`Processing OCR job for document ${documentId}`);

    try {
      await this.documentRepository.updateOcrStatus(documentId, 'processing');

      const ocrResult = await this.processSource(documentId, {
        gcsPath,
        localPath,
      });

      await this.documentRepository.updateOcrStatus(documentId, 'completed');

      this.logger.log('OCR job completed', {
        documentId,
        pageCount: ocrResult?.pageCount,
        confidence: ocrResult?.confidence,
      });
    } catch (error) {
      await this.documentRepository.updateOcrStatus(documentId, 'failed');

      this.logger.error('OCR job failed', {
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  private async processSource(
    documentId: string,
    source: { gcsPath?: string | null; localPath?: string | null },
  ) {
    if (source.localPath) {
      const buffer = await fs.readFile(source.localPath);
      return this.visionService.extractTextFromBuffer(buffer, documentId);
    }

    if (source.gcsPath && source.gcsPath.startsWith('gs://')) {
      return this.visionService.extractTextFromGcs(source.gcsPath, documentId);
    }

    throw new Error('No valid OCR source provided');
  }
}
