import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantsService } from '../../tenants/tenants.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly tenantsService: TenantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    let tenant;
    try {
      tenant = await this.tenantsService.resolveByApiKey(apiKey);
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Invalid API key');
    }

    if (!tenant) {
      throw new UnauthorizedException('Invalid API key');
    }
    if (tenant.status === 'suspended') {
      throw new ForbiddenException('Tenant account is suspended');
    }

    request.tenant = tenant;
    return true;
  }
}
