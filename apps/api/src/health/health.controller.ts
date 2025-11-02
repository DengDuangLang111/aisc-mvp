import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import type { HealthStatus, DetailedHealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ 
    summary: '健康检查', 
    description: '检查 API 服务是否正常运行'
  })
  @ApiResponse({
    status: 200,
    description: 'API 服务正常',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 3600.5 },
      },
    },
  })
  getHealth(): HealthStatus {
    return this.healthService.getHealthStatus();
  }

  @Get('detailed')
  @ApiOperation({ 
    summary: '详细健康检查', 
    description: '获取服务的详细状态信息，包括内存使用、系统信息等'
  })
  @ApiResponse({
    status: 200,
    description: '详细健康状态',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 3600.5 },
        memory: {
          type: 'object',
          properties: {
            heapUsed: { type: 'number', example: 50000000 },
            heapTotal: { type: 'number', example: 100000000 },
            external: { type: 'number', example: 1000000 },
            rss: { type: 'number', example: 150000000 },
          },
        },
        system: {
          type: 'object',
          properties: {
            platform: { type: 'string', example: 'darwin' },
            nodeVersion: { type: 'string', example: 'v18.17.0' },
            cpus: { type: 'number', example: 8 },
          },
        },
      },
    },
  })
  getDetailedHealth(): DetailedHealthStatus {
    return this.healthService.getDetailedHealthStatus();
  }
}
