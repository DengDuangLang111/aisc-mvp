import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OcrProcessor } from './ocr.processor';
import { OcrModule } from './ocr.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentRepository } from '../upload/repositories/document.repository';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    OcrModule,
    PrismaModule,
  ],
  providers: [OcrProcessor, DocumentRepository],
  exports: [BullModule],
})
export class OcrQueueModule {}
