import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LoggerModule } from '../common/logger/logger.module';
import { StorageModule } from '../storage/storage.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { OcrModule } from '../ocr/ocr.module';
import { DocumentRepository } from './repositories/document.repository';
import { OcrQueueModule } from '../ocr/ocr-queue.module';

@Module({
  imports: [LoggerModule, StorageModule, AnalyticsModule, OcrModule, OcrQueueModule],
  controllers: [UploadController],
  providers: [UploadService, DocumentRepository],
  exports: [UploadService, DocumentRepository],
})
export class UploadModule {}
