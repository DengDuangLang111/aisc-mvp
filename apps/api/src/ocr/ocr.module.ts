import { Module } from '@nestjs/common';
import { VisionService } from './vision.service';

/**
 * OCR 模块
 *
 * 提供 Google Cloud Vision OCR 服务
 */
@Module({
  providers: [VisionService],
  exports: [VisionService],
})
export class OcrModule {}
