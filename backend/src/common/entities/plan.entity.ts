import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PlanUsageLimits = Record<string, number>;

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  tier: 'free' | 'pro' | 'business';

  @Column({ type: 'varchar', default: 'month' })
  billingInterval: 'month';

  @Column({ type: 'int' })
  price: number;

  @Column({ name: 'usage_limits', type: 'jsonb', default: {} })
  usageLimits: PlanUsageLimits;

  @Column({ name: 'overage_prices', type: 'jsonb', default: {} })
  overagePrices: PlanUsageLimits;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
