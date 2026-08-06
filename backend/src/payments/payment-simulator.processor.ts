import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { PaymentAttempt } from '../common/entities/payment-attempt.entity';
import { Invoice } from '../common/entities/invoice.entity';
import { bullRedisConnection } from '../common/bull.util';
import { buildRazorpayPaymentEvent, razorpaySignature } from '../webhooks/razorpay-payload.util';

/**
 * Stands in for the Razorpay payment gateway: after a delay it "captures or
 * fails" the charge and delivers a properly signed webhook to our own
 * `/api/webhooks/razorpay` endpoint. Delivering over HTTP keeps the real
 * signature-verification and idempotency path in play.
 */
@Injectable()
export class PaymentSimulatorProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentSimulatorProcessor.name);
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PaymentAttempt)
    private readonly attemptsRepository: Repository<PaymentAttempt>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'payments',
      async (job) => {
        const { attemptId, outcome, reason } = job.data;
        await this.deliverWebhook(attemptId, outcome, reason);
      },
      { connection: bullRedisConnection(this.configService), concurrency: 10 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`payment simulation job failed: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async deliverWebhook(
    attemptId: string,
    outcome: 'success' | 'failed',
    reason?: string,
  ): Promise<void> {
    const attempt = await this.attemptsRepository.findOne({ where: { id: attemptId } });
    if (!attempt || attempt.status !== 'pending') return;

    const invoice = await this.invoicesRepository.findOne({ where: { id: attempt.invoiceId } });
    if (!invoice) return;

    const payload = buildRazorpayPaymentEvent(
      attempt.providerRef,
      `order_${attempt.invoiceId.replace(/-/g, '').slice(0, 14)}`,
      {
        event: outcome === 'success' ? 'payment.captured' : 'payment.failed',
        amountMinor: invoice.totalAmount,
        failureReason: reason,
      },
    );
    const signature = razorpaySignature(
      payload,
      this.configService.get<string>('razorpay.webhookSecret') ?? 'billflow-razorpay-dev-secret',
    );

    const baseUrl = this.configService.get<string>('baseUrl');
    const response = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': signature,
      },
      body: payload,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Webhook delivery failed (${response.status}): ${body}`);
    }
    this.logger.log(
      `Simulated ${outcome} webhook delivered for attempt ${attempt.providerRef}`,
    );
  }
}
