import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Subscription, DunningStage } from '../common/entities/subscription.entity';
import { Tenant } from '../common/entities/tenant.entity';
import { Invoice } from '../common/entities/invoice.entity';
import { PaymentAttempt } from '../common/entities/payment-attempt.entity';
import { PaymentsService } from '../payments/payments.service';
import { parseDelayToMs } from '../common/utils/delay.util';

export interface DunningDelays {
  retry1Ms: number;
  retry2Ms: number;
  suspendMs: number;
}

@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(PaymentAttempt)
    private readonly attemptsRepository: Repository<PaymentAttempt>,
    @InjectQueue('dunning') private readonly dunningQueue: Queue,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  getDelays(): DunningDelays {
    const override = this.configService.get<string>('dunning.delays');
    if (override) {
      const parts = override.split(',').map((p) => p.trim());
      return {
        retry1Ms: parseDelayToMs(parts[0]),
        retry2Ms: parseDelayToMs(parts[1] ?? parts[0]),
        suspendMs: parseDelayToMs(parts[2] ?? parts[1] ?? parts[0]),
      };
    }
    const retryDays = this.configService.get<number[]>('dunning.retryDays') ?? [3, 7];
    const [retry1Day, retry2Day] = retryDays;
    const suspendDay = this.configService.get<number>('dunning.suspendDay') ?? 10;
    const day = 86_400_000;
    return {
      retry1Ms: retry1Day * day,
      retry2Ms: (retry2Day - retry1Day) * day,
      suspendMs: (suspendDay - retry2Day) * day,
    };
  }

  /**
   * State machine: payment_failed -> retry (day 3) -> retry (day 7) -> suspend (day 10).
   * Each transition schedules a delayed BullMQ job for the next action.
   */
  async handlePaymentFailed(
    subscriptionId: string,
    reason: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const delays = this.getDelays();
    let nextStage: DunningStage;
    let delayMs: number;

    if (subscription.dunningStage === null) {
      subscription.status = 'past_due';
      subscription.dunningStartedAt = new Date();
      nextStage = 'retry_1';
      delayMs = delays.retry1Ms;
    } else if (subscription.dunningStage === 'retry_1') {
      nextStage = 'retry_2';
      delayMs = delays.retry2Ms;
    } else if (subscription.dunningStage === 'retry_2') {
      nextStage = 'suspend';
      delayMs = delays.suspendMs;
    } else {
      throw new ConflictException(`Dunning already in final stage: ${subscription.dunningStage}`);
    }

    subscription.dunningStage = nextStage;
    subscription.dunningNextActionAt = new Date(Date.now() + delayMs);
    await this.subscriptionsRepository.save(subscription);

    await this.dunningQueue.add(
      'dunning-action',
      { subscriptionId: subscription.id, stage: nextStage, reason },
      { delay: delayMs, attempts: 3, backoff: { type: 'fixed', delay: 2000 } },
    );

    this.logger.log(
      `[notification] Tenant ${subscription.tenantId}: payment failed (${reason}). ` +
        `Next dunning action: ${nextStage} at ${subscription.dunningNextActionAt.toISOString()}`,
    );
    return subscription;
  }

  /** Attempts to charge the latest open invoice; the webhook result drives the next transition. */
  async executeRetry(subscription: Subscription, stage: 'retry_1' | 'retry_2'): Promise<void> {
    const invoice = await this.latestOpenInvoice(subscription.tenantId);
    if (!invoice) {
      this.logger.warn(`No open invoice for retry; skipping ${stage} for ${subscription.id}`);
      return;
    }
    this.logger.log(
      `[notification] Tenant ${subscription.tenantId}: dunning retry (${stage}) - charging invoice ${invoice.id}`,
    );
    await this.paymentsService.payInvoice(invoice.id, undefined, { outcome: 'success' });
  }

  async executeSuspend(subscription: Subscription): Promise<void> {
    subscription.status = 'suspended';
    subscription.dunningStage = 'suspended';
    subscription.dunningNextActionAt = null;
    await this.subscriptionsRepository.save(subscription);

    const tenant = await this.tenantsRepository.findOne({
      where: { id: subscription.tenantId },
    });
    if (tenant) {
      tenant.status = 'suspended';
      await this.tenantsRepository.save(tenant);
    }

    this.logger.log(
      `[notification] Tenant ${subscription.tenantId}: account suspended after dunning.`,
    );
  }

  async latestOpenInvoice(tenantId: string): Promise<Invoice | null> {
    return this.invoicesRepository.findOne({
      where: { tenantId, status: In(['open', 'draft']) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Demo/debug helper: records a failed payment and advances the dunning state
   * machine, so the full Day 3 -> Day 7 -> suspend ladder can be exercised
   * without waiting on a real gateway.
   */
  async simulateFailure(tenantId: string, reason = 'card_declined'): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { tenantId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const invoice = await this.latestOpenInvoice(tenantId);
    if (!invoice) throw new ConflictException('No open invoice to fail payment on');

    const attemptNumber = (await this.attemptsRepository.count({ where: { invoiceId: invoice.id } })) + 1;
    const attempt = this.attemptsRepository.create({
      invoiceId: invoice.id,
      providerRef: `pay_${randomUUID().replace(/-/g, '').slice(0, 18)}`,
      status: 'failed',
      attemptNumber,
      failureReason: reason,
    });
    await this.attemptsRepository.save(attempt);

    return this.handlePaymentFailed(subscription.id, reason);
  }

  async status(tenantId: string) {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { tenantId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return {
      tenantId,
      subscriptionStatus: subscription.status,
      dunningStage: subscription.dunningStage,
      dunningStartedAt: subscription.dunningStartedAt,
      dunningNextActionAt: subscription.dunningNextActionAt,
      delays: this.getDelays(),
    };
  }
}
