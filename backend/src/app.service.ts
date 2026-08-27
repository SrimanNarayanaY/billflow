import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { REDIS } from './common/redis.provider';

@Injectable()
export class AppService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  getInfo() {
    return {
      service: 'BillFlow API',
      description: 'Multi-tenant subscription billing engine',
      version: '1.0.0',
      endpoints: [
        'POST /api/tenants',
        'POST /api/auth/login',
        'POST /api/usage/events',
        'POST /api/webhooks/razorpay',
        'POST /api/invoices/generate-due',
      ],
    };
  }

  async checkHealth() {
    let dbStatus = 'up';
    let redisStatus = 'up';
    let isHealthy = true;

    try {
      await this.dataSource.query('SELECT 1');
    } catch (err) {
      dbStatus = 'down';
      isHealthy = false;
    }

    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        redisStatus = 'down';
        isHealthy = false;
      }
    } catch (err) {
      redisStatus = 'down';
      isHealthy = false;
    }

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}

