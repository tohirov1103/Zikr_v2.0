import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    return this.healthService.check();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependencies' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  async detailedCheck() {
    return this.healthService.detailedCheck();
  }
}
