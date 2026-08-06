import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class PayInvoiceDto {
  @IsOptional()
  @IsIn(['success', 'failed'])
  outcome?: 'success' | 'failed';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SimulatePaymentDto extends PayInvoiceDto {
  @IsUUID()
  invoiceId: string;
}
