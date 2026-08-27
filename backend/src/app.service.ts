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

    // 1. Database Check with 2-second timeout
    try {
      const dbCheck = this.dataSource.query('SELECT 1');
      const dbTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 2000),
      );
      await Promise.race([dbCheck, dbTimeout]);
    } catch (err) {
      dbStatus = 'down';
      isHealthy = false;
    }

    // 2. Redis Check with Status check and 2-second timeout
    try {
      if (this.redis.status !== 'ready') {
        redisStatus = 'down';
        isHealthy = false;
      } else {
        const redisCheck = this.redis.ping();
        const redisTimeout = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 2000),
        );
        const pong = await Promise.race([redisCheck, redisTimeout]);
        if (pong !== 'PONG') {
          redisStatus = 'down';
          isHealthy = false;
        }
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

