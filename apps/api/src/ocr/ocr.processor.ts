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

    this.logger.log(`Processing OCR job for document ${documentId}`, {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });

    try {
      // Idempotency: if already completed, skip.
      const current = await this.documentRepository.findById(documentId);
      if (current?.ocrStatus === 'completed') {
        this.logger.log('Skipping OCR job for already completed document', {
          documentId,
          jobId: job.id,
        });
        return;
      }

      await this.documentRepository.updateOcrStatus(documentId, 'processing');

      const ocrResult = await this.processSource(documentId, {
        gcsPath,
        localPath,
      });

      await this.documentRepository.updateOcrStatus(documentId, 'completed');

      this.logger.log('OCR job completed', {
        documentId,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        pageCount: ocrResult?.pageCount,
        confidence: ocrResult?.confidence,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Mark failed for this attempt; Bull will handle retries based on attempts/backoff.
      await this.documentRepository.updateOcrStatus(documentId, 'failed');

      this.logger.error('OCR job failed', {
        documentId,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        error: errorMessage,
      });

      // On final failure (no more retries), emit a strong signal (logger-level only for now).
      if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
        this.logger.error('OCR job reached max attempts, marking as permanently failed', {
          documentId,
          jobId: job.id,
          attempts: job.opts.attempts || 1,
        });
      }

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
