import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEvent } from '../common/entities/webhook-event.entity';
import { PaymentsService } from '../payments/payments.service';
import { InvoicingService } from '../invoicing/invoicing.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { DunningService } from '../dunning/dunning.service';
import { verifyRazorpaySignature } from './razorpay-payload.util';

export interface WebhookResult {
  handled: boolean;
  duplicate: boolean;
  event: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookEvent)
    private readonly webhookEventsRepository: Repository<WebhookEvent>,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly invoicingService: InvoicingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly dunningService: DunningService,
  ) {}

  async verifyAndProcess(rawBody: string, signature: string | undefined, body: unknown): Promise<WebhookResult> {
    const secret =
      this.configService.get<string>('razorpay.webhookSecret') ?? 'billflow-razorpay-dev-secret';
    if (!signature || !verifyRazorpaySignature(rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; error_description?: string } } };
    };
    const eventType = payload.event;
    const entity = payload.payload?.payment?.entity;
    if (!eventType || !entity?.id) {
      throw new BadRequestException('Malformed webhook payload');
    }

    const providerEventId = `${eventType}:${entity.id}`;

    // Idempotency guard: the provider_event_id column is unique. Concurrent or
    // duplicate deliveries are detected here before any side effect happens.
    const existing = await this.webhookEventsRepository.findOne({
      where: { providerEventId },
    });
    if (existing?.processedAt) {
      return { handled: false, duplicate: true, event: eventType };
    }
    if (!existing) {
      try {
        const event = this.webhookEventsRepository.create({
          providerEventId,
          provider: 'razorpay',
          eventType,
          payload: payload as unknown as Record<string, unknown>,
          processedAt: null,
        });
        await this.webhookEventsRepository.save(event);
      } catch (error: any) {
        if (error?.code === '23505') {
          return { handled: false, duplicate: true, event: eventType };
        }
        throw error;
      }
    }

    if (eventType === 'payment.captured') {
      await this.handlePaymentCaptured(entity.id);
    } else if (eventType === 'payment.failed') {
      await this.handlePaymentFailed(entity.id, entity.error_description ?? 'Payment failed');
    } else {
      this.logger.warn(`Unhandled event type: ${eventType}`);
    }

    await this.webhookEventsRepository.update({ providerEventId }, { processedAt: new Date() });
    return { handled: true, duplicate: false, event: eventType };
  }

  private async handlePaymentCaptured(providerRef: string): Promise<void> {
    const attempt = await this.paymentsService.findByProviderRef(providerRef);
    if (!attempt) {
      this.logger.warn(`Payment captured for unknown attempt ${providerRef}`);
      return;
    }
    if (attempt.status === 'succeeded') return;

    await this.paymentsService.markSucceeded(attempt.id);
    const invoice = await this.invoicingService.markPaid(attempt.invoiceId);
    await this.subscriptionsService.reactivateAfterPayment(invoice.tenantId);

    this.logger.log(
      `Payment ${providerRef} captured -> invoice ${invoice.id} paid, tenant ${invoice.tenantId} active`,
    );
  }

  private async handlePaymentFailed(providerRef: string, reason: string): Promise<void> {
    const attempt = await this.paymentsService.findByProviderRef(providerRef);
    if (!attempt) {
      this.logger.warn(`Payment failed for unknown attempt ${providerRef}`);
      return;
    }
    if (attempt.status === 'failed') return;

    await this.paymentsService.markFailed(attempt.id, reason);
    const { invoice } = await this.invoicingService.detail(attempt.invoiceId);
    const subscription = await this.subscriptionsService.findByTenant(invoice.tenantId);
    if (subscription && subscription.status === 'active') {
      await this.dunningService.handlePaymentFailed(subscription.id, reason);
    }

    this.logger.log(
      `Payment ${providerRef} failed -> dunning started for tenant ${invoice.tenantId}`,
    );
  }
}
