import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../common/entities/subscription.entity';
import { Tenant } from '../common/entities/tenant.entity';
import { Invoice } from '../common/entities/invoice.entity';
import { PaymentAttempt } from '../common/entities/payment-attempt.entity';
import { PaymentsModule } from '../payments/payments.module';
import { DunningService } from './dunning.service';
import { DunningController } from './dunning.controller';
import { DunningProcessor } from './dunning.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Tenant, Invoice, PaymentAttempt]),
    BullModule.registerQueue({ name: 'dunning' }),
    PaymentsModule,
  ],
  controllers: [DunningController],
  providers: [DunningService, DunningProcessor],
  exports: [DunningService],
})
export class DunningModule {}
