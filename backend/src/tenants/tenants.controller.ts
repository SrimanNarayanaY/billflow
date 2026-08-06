import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  register(@Body() dto: CreateTenantDto) {
    return this.tenantsService.register(dto.name);
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
