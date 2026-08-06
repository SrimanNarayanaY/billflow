import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentAttempt } from '../common/entities/payment-attempt.entity';
import { Invoice } from '../common/entities/invoice.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentSimulatorProcessor } from './payment-simulator.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentAttempt, Invoice]),
    BullModule.registerQueue({ name: 'payments' }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentSimulatorProcessor],
  exports: [PaymentsService],
})
export class PaymentsModule {}
