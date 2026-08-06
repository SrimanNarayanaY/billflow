import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { DunningService } from './dunning.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('dunning')
@UseGuards(JwtAuthGuard)
export class DunningController {
  constructor(private readonly dunningService: DunningService) {}

  @Get(':tenantId/status')
  status(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.dunningService.status(tenantId);
  }

  @Post(':tenantId/simulate-failure')
  simulateFailure(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() body: { reason?: string },
  ) {
    return this.dunningService.simulateFailure(tenantId, body.reason);
  }
}
