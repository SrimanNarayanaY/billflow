import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS } from '../common/redis.provider';

export interface FlushedUsage {
  metric: string;
  quantity: number;
}

/**
 * Real-time usage counters backed by Redis hashes.
 *
 * Every usage event is a `HINCRBY` on a per-tenant hash whose fields are namespaced
 * by the billing-cycle key: `<cycleKey>:<metric>`. Because Redis executes commands
 * atomically on a single connection, concurrent requests cannot lose increments.
 *
 * Counters are flushed into Postgres (`usage_events`) when a cycle closes and the
 * invoice is generated.
 */
@Injectable()
export class UsageCacheService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  private cycleKeyName(tenantId: string): string {
    return `bf:cycle:${tenantId}`;
  }

  private usageKeyName(tenantId: string): string {
    return `bf:usage:${tenantId}`;
  }

  async getCycleKey(tenantId: string): Promise<string | null> {
    return this.redis.get(this.cycleKeyName(tenantId));
  }

  async setCycleKey(tenantId: string, cycleKey: string): Promise<void> {
    await this.redis.set(this.cycleKeyName(tenantId), cycleKey);
  }

  async increment(tenantId: string, metric: string, quantity: number): Promise<void> {
    const cycleKey = await this.getCycleKey(tenantId);
    if (!cycleKey) {
      throw new Error('No active billing cycle for tenant');
    }
    await this.redis.hincrby(this.usageKeyName(tenantId), `${cycleKey}:${metric}`, quantity);
  }

  async getCurrent(tenantId: string): Promise<Record<string, number>> {
    const cycleKey = await this.getCycleKey(tenantId);
    if (!cycleKey) return {};
    const all = await this.redis.hgetall(this.usageKeyName(tenantId));
    const prefix = `${cycleKey}:`;
    const result: Record<string, number> = {};
    for (const [field, value] of Object.entries(all)) {
      if (field.startsWith(prefix)) {
        result[field.slice(prefix.length)] = parseInt(value, 10);
      }
    }
    return result;
  }

  /**
   * Atomically read and clear counters belonging to one cycle. Returns the
   * events that must be persisted to Postgres. The HGETALL + HDEL are wrapped
   * in a Redis MULTI transaction so no increments are lost or double-read.
   */
  async flush(tenantId: string, cycleKey: string): Promise<FlushedUsage[]> {
    const all = await this.redis.hgetall(this.usageKeyName(tenantId));
    const prefix = `${cycleKey}:`;
    const events: FlushedUsage[] = [];
    const pipeline = this.redis.multi();
    for (const [field, value] of Object.entries(all)) {
      if (field.startsWith(prefix)) {
        events.push({ metric: field.slice(prefix.length), quantity: parseInt(value, 10) });
        pipeline.hdel(this.usageKeyName(tenantId), field);
      }
    }
    if (events.length > 0) {
      await pipeline.exec();
    }
    return events;
  }

  async resetTenant(tenantId: string): Promise<void> {
    await this.redis.del(this.cycleKeyName(tenantId), this.usageKeyName(tenantId));
  }
}
