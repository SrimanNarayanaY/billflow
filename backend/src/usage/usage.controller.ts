import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { RecordUsageEventDto } from './dto/record-usage-event.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @UseGuards(ApiKeyGuard)
  @Post('events')
  record(@Tenant() tenant: { id: string }, @Body() dto: RecordUsageEventDto) {
    return this.usageService.recordEvent(tenant.id, dto.metric, dto.quantity ?? 1);
  }

  @UseGuards(ApiKeyGuard)
  @Get('current')
  getOwnCurrent(@Tenant() tenant: { id: string }) {
    return this.usageService.getCurrent(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':tenantId/current')
  getTenantCurrent(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.usageService.getCurrent(tenantId);
  }
}
