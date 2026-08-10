import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards, UnauthorizedException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantOrAdminGuard } from '../common/guards/tenant-or-admin.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  register(@Body() dto: CreateTenantDto) {
    return this.tenantsService.register(dto.name);
  }

  @UseGuards(TenantOrAdminGuard)
  @Get('me')
  getProfile(@Tenant() tenant: { id: string } | undefined) {
    if (!tenant) {
      throw new UnauthorizedException('Tenant context required');
    }
    return this.tenantsService.findByIdWithSubscription(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list() {
    return this.tenantsService.list();
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/api-key/rotate')
  rotateApiKey(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantsService.rotateApiKey(id);
  }
}
