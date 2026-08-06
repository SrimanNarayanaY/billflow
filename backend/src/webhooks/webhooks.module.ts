import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEvent } from '../common/entities/webhook-event.entity';
import { PaymentAttempt } from '../common/entities/payment-attempt.entity';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { DunningModule } from '../dunning/dunning.module';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent, PaymentAttempt]),
    PaymentsModule,
    InvoicingModule,
    SubscriptionsModule,
    DunningModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
