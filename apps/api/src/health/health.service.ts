import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  memory: {
    used: string;
    total: string;
    percentage: string;
    rss: string;
    external: string;
  };
  environment: string;
  dependencies: {
    uploads: {
      status: 'available' | 'unavailable';
      path: string;
      writable: boolean;
    };
  };
  process: {
    pid: number;
    nodeVersion: string;
    platform: string;
    cpuUsage: {
      user: number;
      system: number;
    };
  };
  performance: {
    eventLoopDelay: string;
    activeHandles: number;
    activeRequests: number;
  };
}

@Injectable()
export class HealthService {
  private readonly startTime: number;
  private lastCpuUsage: NodeJS.CpuUsage;

  constructor(private readonly configService: ConfigService) {
    this.startTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();
  }

  getHealthStatus(): HealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  getDetailedHealthStatus(): DetailedHealthStatus {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryPercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

    const uploadsDir = this.configService.get<string>('upload.directory') || './uploads';
    const uploadsPath = path.resolve(uploadsDir);
    
    let uploadsStatus: 'available' | 'unavailable' = 'unavailable';
    let uploadsWritable = false;

    try {
      // Check if uploads directory exists and is writable
      if (fs.existsSync(uploadsPath)) {
        uploadsStatus = 'available';
        fs.accessSync(uploadsPath, fs.constants.W_OK);
        uploadsWritable = true;
      }
    } catch (error) {
      // Directory not writable or doesn't exist
    }

    // Get CPU usage
    const cpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    // Get event loop metrics
    const handles = (process as any)._getActiveHandles?.()?.length || 0;
    const requests = (process as any)._getActiveRequests?.()?.length || 0;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: `${(usedMemory / 1024 / 1024).toFixed(2)} MB`,
        total: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`,
        percentage: `${memoryPercentage}%`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
      },
      environment: this.configService.get<string>('NODE_ENV') || 'development',
      dependencies: {
        uploads: {
          status: uploadsStatus,
          path: uploadsPath,
          writable: uploadsWritable,
        },
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        cpuUsage: {
          user: Math.floor(cpuUsage.user / 1000), // Convert to milliseconds
          system: Math.floor(cpuUsage.system / 1000),
        },
      },
      performance: {
        eventLoopDelay: '< 1ms', // Placeholder - could use perf_hooks for real measurement
        activeHandles: handles,
        activeRequests: requests,
      },
    };
  }
}
