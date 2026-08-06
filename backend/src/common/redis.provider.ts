import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export const REDIS = 'REDIS';

export type RedisFactory = (config: ConfigService) => Redis;

export const redisFactory: RedisFactory = (config: ConfigService): Redis => {
  return new Redis({
    host: config.get<string>('redis.host'),
    port: config.get<number>('redis.port'),
    maxRetriesPerRequest: null,
  });
};
