import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export const REDIS = 'REDIS';

export type RedisFactory = (config: ConfigService) => Redis;

export const redisFactory: RedisFactory = (config: ConfigService): Redis => {
  return new Redis({
    host: config.get<string>('redis.host'),
    port: config.get<number>('redis.port'),
    username: config.get<string>('redis.username'),
    password: config.get<string>('redis.password'),
    tls: config.get<any>('redis.tls'),
    maxRetriesPerRequest: null,
  });
};
