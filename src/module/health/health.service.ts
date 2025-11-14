import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@prisma';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    try {
      // Simple health check
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          message: 'Service unhealthy',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async detailedCheck() {
    const startTime = Date.now();

    // Database check
    let databaseStatus = 'ok';
    let databaseResponseTime = 0;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      databaseResponseTime = Date.now() - dbStart;
    } catch (error) {
      databaseStatus = 'error';
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };

    // CPU usage (approximation)
    const cpuUsage = process.cpuUsage();

    const totalResponseTime = Date.now() - startTime;

    return {
      status: databaseStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      dependencies: {
        database: {
          status: databaseStatus,
          responseTime: `${databaseResponseTime}ms`,
        },
      },
      system: {
        memory: memoryUsageMB,
        cpu: {
          user: Math.round(cpuUsage.user / 1000),
          system: Math.round(cpuUsage.system / 1000),
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      responseTime: `${totalResponseTime}ms`,
    };
  }
}
