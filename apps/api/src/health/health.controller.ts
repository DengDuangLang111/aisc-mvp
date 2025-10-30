import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthStatus, DetailedHealthStatus } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthStatus {
    return this.healthService.getHealthStatus();
  }

  @Get('detailed')
  getDetailedHealth(): DetailedHealthStatus {
    return this.healthService.getDetailedHealthStatus();
  }
}
