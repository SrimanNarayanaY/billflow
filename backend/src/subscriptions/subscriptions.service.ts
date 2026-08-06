import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Subscription } from '../common/entities/subscription.entity';
import { PlansService } from '../plans/plans.service';
import { ProrationService } from '../proration/proration.service';
import { UsageCacheService } from '../usage/usage-cache.service';
import { addMonths } from '../common/utils/date.util';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly plansService: PlansService,
    private readonly prorationService: ProrationService,
    private readonly usageCache: UsageCacheService,
    private readonly dataSource: DataSource,
  ) {}

  async create(tenantId: string, planId: string): Promise<Subscription> {
    const existing = await this.subscriptionsRepository.findOne({ where: { tenantId } });
    if (existing && existing.status !== 'canceled' && existing.status !== 'suspended') {
      throw new ConflictException('Tenant already has an active subscription');
    }

    const plan = await this.plansService.findById(planId);
    const now = new Date();

    const subscription = this.subscriptionsRepository.create({
      tenantId,
      planId: plan.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: addMonths(now, 1),
    });
    await this.subscriptionsRepository.save(subscription);

    await this.usageCache.setCycleKey(tenantId, subscription.currentPeriodStart.toISOString());
    return subscription;
  }

  async findByTenant(tenantId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({ where: { tenantId } });
  }

  async findById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { id },
      relations: ['plan'],
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async get(tenantId: string | null, id: string): Promise<Subscription> {
    const subscription = await this.findById(id);
    if (tenantId && subscription.tenantId !== tenantId) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  async changePlan(tenantId: string | null, id: string, newPlanId: string): Promise<Subscription> {
    const subscription = await this.get(tenantId, id);
    if (subscription.status === 'canceled') {
      throw new ConflictException('Cannot change plan on a canceled subscription');
    }
    if (subscription.status === 'suspended') {
      throw new ConflictException('Cannot change plan on a suspended subscription');
    }

    const newPlan = await this.plansService.findById(newPlanId);
    const oldPlanPrice = subscription.plan.price;

    const { lineItem } = await this.prorationService.changePlanProration(
      subscription,
      oldPlanPrice,
      newPlan.price,
      new Date(),
    );

    subscription.planId = newPlan.id;
    await this.subscriptionsRepository.save(subscription);
    return subscription;
  }

  async cancel(tenantId: string | null, id: string): Promise<Subscription> {
    const subscription = await this.get(tenantId, id);
    if (subscription.status === 'canceled') {
      throw new ConflictException('Subscription already canceled');
    }
    subscription.cancelAtPeriodEnd = true;
    subscription.status = 'canceled';
    await this.subscriptionsRepository.save(subscription);
    return subscription;
  }

  async clearDunning(subscription: Subscription): Promise<Subscription> {
    subscription.dunningStage = null;
    subscription.dunningStartedAt = null;
    subscription.dunningNextActionAt = null;
    return this.subscriptionsRepository.save(subscription);
  }

  async reactivateAfterPayment(tenantId: string): Promise<Subscription | null> {
    const subscription = await this.findByTenant(tenantId);
    if (!subscription) return null;
    if (subscription.status === 'past_due' || subscription.status === 'suspended') {
      subscription.status = 'active';
    }
    await this.clearDunning(subscription);
    return subscription;
  }
}
