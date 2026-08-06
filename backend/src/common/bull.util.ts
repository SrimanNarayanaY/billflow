import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'bullmq';

export function bullRedisConnection(config: ConfigService): RedisOptions {
  return {
    host: config.get<string>('redis.host'),
    port: config.get<number>('redis.port'),
    maxRetriesPerRequest: null,
  };
}
