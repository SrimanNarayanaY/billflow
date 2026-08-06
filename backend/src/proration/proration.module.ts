import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceLineItem } from '../common/entities/invoice-line-item.entity';
import { ProrationService } from './proration.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceLineItem])],
  providers: [ProrationService],
  exports: [ProrationService],
})
export class ProrationModule {}
