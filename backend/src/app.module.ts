import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { CoreModule } from './core.module';
import { Plan } from './common/entities/plan.entity';
import { Tenant } from './common/entities/tenant.entity';
import { Subscription } from './common/entities/subscription.entity';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsageModule } from './usage/usage.module';
import { ProrationModule } from './proration/proration.module';
import { InvoicingModule } from './invoicing/invoicing.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DunningModule } from './dunning/dunning.module';
import { bullRedisConnection } from './common/bull.util';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : undefined,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: bullRedisConnection(config),
      }),
    }),
    CoreModule,
    TypeOrmModule.forFeature([Plan, Tenant, Subscription]),
    AuthModule,
    TenantsModule,
    PlansModule,
    SubscriptionsModule,
    UsageModule,
    ProrationModule,
    InvoicingModule,
    PaymentsModule,
    WebhooksModule,
    DunningModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
