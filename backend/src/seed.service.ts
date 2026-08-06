import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './common/entities/plan.entity';
import { Tenant } from './common/entities/tenant.entity';
import { Subscription } from './common/entities/subscription.entity';
import { TenantsService } from './tenants/tenants.service';
import { UsageCacheService } from './usage/usage-cache.service';
import { InvoicingService } from './invoicing/invoicing.service';
import { addDays } from './common/utils/date.util';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly configService: ConfigService,
    private readonly usageCache: UsageCacheService,
    private readonly invoicingService: InvoicingService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedPlans();
    await this.seedDemoTenant();
    await this.invoicingService.generateDueInvoices();
    this.logCredentials();
  }

  private async seedPlans(): Promise<void> {
    const count = await this.plansRepository.count();
    if (count > 0) return;

    const plans = this.plansRepository.create([
      {
        name: 'Free',
        tier: 'free',
        billingInterval: 'month',
        price: 0,
        usageLimits: { api_calls: 1_000, storage_gb: 1, seats: 1 },
        overagePrices: { api_calls: 100 },
      },
      {
        name: 'Pro',
        tier: 'pro',
        billingInterval: 'month',
        price: 199_900,
        usageLimits: { api_calls: 10_000, storage_gb: 10, seats: 5 },
        overagePrices: { api_calls: 50, storage_gb: 1_000, seats: 2_000 },
      },
      {
        name: 'Business',
        tier: 'business',
        billingInterval: 'month',
        price: 999_900,
        usageLimits: { api_calls: 100_000, storage_gb: 100, seats: 50 },
        overagePrices: { api_calls: 25, storage_gb: 500, seats: 1_000 },
      },
    ]);
    await this.plansRepository.save(plans);
    this.logger.log('Seeded Free / Pro / Business plans');
  }

  private async seedDemoTenant(): Promise<void> {
    const demoApiKey = this.configService.get<string>('demoApiKey') ?? 'billflow_demo_key';
    const parts = demoApiKey.split('_');
    const keyId = parts[1];

    let tenant = await this.tenantsRepository.findOne({ where: { name: 'Acme Corp' } });
    if (!tenant) {
      tenant = this.tenantsRepository.create({
        name: 'Acme Corp',
        apiKeyId: keyId,
        apiKeyHash: TenantsService.hashApiKey(demoApiKey),
      });
      await this.tenantsRepository.save(tenant);
      this.logger.log('Seeded demo tenant "Acme Corp"');
    }

    const existing = await this.subscriptionsRepository.findOne({ where: { tenantId: tenant.id } });
    if (!existing) {
      const proPlan = await this.plansRepository.findOne({ where: { tier: 'pro' } });
      if (!proPlan) throw new Error('Pro plan missing from seed - run seedPlans first');
      const now = new Date();
      const periodStart = addDays(now, -29);
      const periodEnd = addDays(now, -1);
      const subscription = this.subscriptionsRepository.create({
        tenantId: tenant.id,
        planId: proPlan.id,
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      });
      await this.subscriptionsRepository.save(subscription);
      await this.usageCache.setCycleKey(tenant.id, periodStart.toISOString());
      this.logger.log('Seeded demo subscription (cycle already ended so an invoice generates immediately)');
    }
  }

  private logCredentials(): void {
    this.logger.log('-----------------------------------------');
    this.logger.log(`Admin dashboard login  : ${this.configService.get('admin.email')} / ${this.configService.get('admin.password')}`);
    this.logger.log(`Demo tenant API key    : ${this.configService.get('demoApiKey')}`);
    this.logger.log('-----------------------------------------');
  }
}
