import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { REDIS, redisFactory } from './common/redis.provider';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { TenantOrAdminGuard } from './common/guards/tenant-or-admin.guard';
import { UsageCacheService } from './usage/usage-cache.service';
import { TenantsModule } from './tenants/tenants.module';

@Global()
@Module({
  imports: [
    TenantsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwtSecret'),
        signOptions: { expiresIn: '12h' },
      }),
    }),
  ],
  providers: [
    {
      provide: REDIS,
      useFactory: redisFactory,
      inject: [ConfigService],
    },
    ApiKeyGuard,
    TenantOrAdminGuard,
    UsageCacheService,
  ],
  exports: [REDIS, ApiKeyGuard, TenantOrAdminGuard, UsageCacheService, TenantsModule],
})
export class CoreModule {}
