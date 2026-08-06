import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../common/entities/invoice.entity';
import { InvoiceLineItem } from '../common/entities/invoice-line-item.entity';
import { UsageEvent } from '../common/entities/usage-event.entity';
import { Subscription } from '../common/entities/subscription.entity';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicingService } from './invoicing.service';
import { InvoicingController } from './invoicing.controller';
import { CycleCloseProcessor } from './cycle-close.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceLineItem, UsageEvent, Subscription]),
    BullModule.registerQueue({ name: 'billing' }),
    PaymentsModule,
  ],
  controllers: [InvoicingController],
  providers: [InvoicingService, CycleCloseProcessor],
  exports: [InvoicingService],
})
export class InvoicingModule {}
