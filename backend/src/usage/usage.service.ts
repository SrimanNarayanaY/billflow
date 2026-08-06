import { Injectable, NotFoundException } from '@nestjs/common';
import { UsageCacheService } from './usage-cache.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class UsageService {
  constructor(
    private readonly usageCache: UsageCacheService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async recordEvent(tenantId: string, metric: string, quantity: number) {
    const subscription = await this.subscriptionsService.findByTenant(tenantId);
    if (!subscription || subscription.status === 'canceled' || subscription.status === 'suspended') {
      throw new NotFoundException('No active subscription for tenant');
    }
    await this.usageCache.increment(tenantId, metric, quantity);
    return this.usageCache.getCurrent(tenantId);
  }

  async getCurrent(tenantId: string): Promise<Record<string, number>> {
    return this.usageCache.getCurrent(tenantId);
  }
}
