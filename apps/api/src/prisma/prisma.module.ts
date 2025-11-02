import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma 模块
 * 
 * 全局模块，提供 PrismaService 给所有其他模块使用
 * 使用 @Global() 装饰器避免在每个模块中重复导入
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
