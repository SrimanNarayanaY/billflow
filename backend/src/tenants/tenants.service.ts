import { createHash, randomBytes } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../common/entities/tenant.entity';

export interface GeneratedApiKey {
  plainKey: string;
  keyId: string;
  keyHash: string;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepository: Repository<Tenant>,
  ) {}

  static generateApiKey(): GeneratedApiKey {
    const keyId = randomBytes(8).toString('hex');
    const secret = randomBytes(24).toString('base64url');
    const plainKey = `billflow_${keyId}_${secret}`;
    const keyHash = createHash('sha256').update(plainKey).digest('hex');
    return { plainKey, keyId, keyHash };
  }

  static hashApiKey(plainKey: string): string {
    return createHash('sha256').update(plainKey).digest('hex');
  }

  async register(name: string): Promise<{ tenant: Tenant; apiKey: string }> {
    const { plainKey, keyId, keyHash } = TenantsService.generateApiKey();
    const tenant = this.tenantsRepository.create({
      name,
      apiKeyId: keyId,
      apiKeyHash: keyHash,
    });
    await this.tenantsRepository.save(tenant);
    return { tenant, apiKey: plainKey };
  }

  async resolveByApiKey(plainKey: string): Promise<Tenant | null> {
    const parts = plainKey.split('_');
    const keyId = parts[1];
    if (!keyId) return null;

    const tenant = await this.tenantsRepository.findOne({ where: { apiKeyId: keyId } });
    if (!tenant) return null;

    const hash = TenantsService.hashApiKey(plainKey);
    if (hash !== tenant.apiKeyHash) return null;
    return tenant;
  }

  async rotateApiKey(id: string): Promise<{ tenant: Tenant; apiKey: string }> {
    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const { plainKey, keyId, keyHash } = TenantsService.generateApiKey();
    tenant.apiKeyId = keyId;
    tenant.apiKeyHash = keyHash;
    await this.tenantsRepository.save(tenant);
    return { tenant, apiKey: plainKey };
  }

  async setStatus(id: string, status: Tenant['status']): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    tenant.status = status;
    return this.tenantsRepository.save(tenant);
  }

  async list(): Promise<Tenant[]> {
    return this.tenantsRepository.find({
      relations: ['subscription', 'subscription.plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findByIdWithSubscription(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id },
      relations: ['subscription', 'subscription.plan'],
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }
}
