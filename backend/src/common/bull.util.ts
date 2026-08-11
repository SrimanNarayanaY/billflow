import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'bullmq';

export function bullRedisConnection(config: ConfigService): RedisOptions {
  return {
    host: config.get<string>('redis.host'),
    port: config.get<number>('redis.port'),
    username: config.get<string>('redis.username'),
    password: config.get<string>('redis.password'),
    tls: config.get<any>('redis.tls'),
    maxRetriesPerRequest: null,
  };
}
