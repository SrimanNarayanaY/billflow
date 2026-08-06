import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { TenantOrAdminGuard } from '../common/guards/tenant-or-admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(TenantOrAdminGuard)
  @Post('invoices/:id/pay')
  pay(
    @Tenant() tenant: { id: string } | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.paymentsService.payInvoice(id, tenant?.id, {
      outcome: dto.outcome ?? 'success',
      reason: dto.reason,
    });
  }
}
