import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({
    summary: '获取 Prometheus 指标',
    description: '返回所有应用指标，供 Prometheus 抓取',
  })
  @ApiResponse({
    status: 200,
    description: '返回 Prometheus 格式的指标数据',
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
