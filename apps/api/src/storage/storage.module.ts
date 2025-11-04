import { Module } from '@nestjs/common';
import { GcsService } from './gcs.service';

/**
 * Storage 模块
 *
 * 提供云存储服务（Google Cloud Storage）
 */
@Module({
  providers: [GcsService],
  exports: [GcsService],
})
export class StorageModule {}
