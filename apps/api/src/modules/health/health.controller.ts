import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('health')
export class HealthController {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  @Get()
  async check() {
    const uptime = process.uptime();
    const dbOk = await this.prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    return {
      status: dbOk ? 'ok' : 'degraded',
      uptime: Math.round(uptime),
      db: dbOk,
      timestamp: new Date().toISOString(),
    };
  }
}