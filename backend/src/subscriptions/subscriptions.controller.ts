import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { TenantOrAdminGuard } from '../common/guards/tenant-or-admin.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(ApiKeyGuard)
  @Post()
  create(@Tenant() tenant: { id: string }, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(tenant.id, dto.planId);
  }

  @UseGuards(TenantOrAdminGuard)
  @Patch(':id/change-plan')
  changePlan(
    @Tenant() tenant: { id: string } | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionsService.changePlan(tenant?.id ?? null, id, dto.planId);
  }

  @UseGuards(TenantOrAdminGuard)
  @Post(':id/cancel')
  cancel(@Tenant() tenant: { id: string } | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.cancel(tenant?.id ?? null, id);
  }

  @UseGuards(TenantOrAdminGuard)
  @Get(':id')
  get(@Tenant() tenant: { id: string } | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.get(tenant?.id ?? null, id);
  }
}
