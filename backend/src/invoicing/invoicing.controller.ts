import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { InvoicingService } from './invoicing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantOrAdminGuard } from '../common/guards/tenant-or-admin.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('invoices')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  listAll() {
    return this.invoicingService.listAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('detail/:id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicingService.detail(id);
  }

  @UseGuards(TenantOrAdminGuard)
  @Get(':tenantId')
  listByTenant(
    @Tenant() tenant: { id: string } | undefined,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    if (tenant && tenant.id !== tenantId) {
      throw new ForbiddenException('Access denied');
    }
    return this.invoicingService.listByTenant(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate-due')
  generateDue() {
    return this.invoicingService.generateDueInvoices();
  }
}
