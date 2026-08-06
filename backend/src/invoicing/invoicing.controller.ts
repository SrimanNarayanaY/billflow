import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Get()
  listAll() {
    return this.invoicingService.listAll();
  }

  @Get('detail/:id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicingService.detail(id);
  }

  @Get(':tenantId')
  listByTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.invoicingService.listByTenant(tenantId);
  }

  @Post('generate-due')
  generateDue() {
    return this.invoicingService.generateDueInvoices();
  }
}
