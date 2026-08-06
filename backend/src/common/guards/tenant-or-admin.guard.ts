import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantsService } from '../../tenants/tenants.service';

@Injectable()
export class TenantOrAdminGuard implements CanActivate {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const authorization: string | undefined = request.headers['authorization'];

    if (apiKey && typeof apiKey === 'string') {
      const tenant = await this.tenantsService.resolveByApiKey(apiKey);
      if (!tenant) throw new UnauthorizedException('Invalid API key');
      if (tenant.status === 'suspended') throw new UnauthorizedException('Tenant suspended');
      request.tenant = tenant;
      return true;
    }

    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwtService.verifyAsync(authorization.slice(7), {
          secret: this.configService.get<string>('jwtSecret'),
        });
        request.admin = { userId: payload.sub, role: payload.role };
        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    throw new UnauthorizedException('X-API-Key or Bearer token required');
  }
}
