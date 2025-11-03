import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LoggerModule } from '../common/logger/logger.module';
import { StorageModule } from '../storage/storage.module';
import { OcrModule } from '../ocr/ocr.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DocumentRepository } from './repositories/document.repository';

@Module({
  imports: [
    LoggerModule,
    StorageModule,
    OcrModule,
    AnalyticsModule,
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    DocumentRepository,
  ],
  exports: [UploadService, DocumentRepository],
})
export class UploadModule {}
