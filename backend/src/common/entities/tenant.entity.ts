import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

export type TenantStatus = 'active' | 'suspended';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index()
  @Column({ name: 'api_key_id', type: 'varchar', unique: true })
  apiKeyId: string;

  @Column({ name: 'api_key_hash', type: 'varchar' })
  apiKeyHash: string;

  @Column({ type: 'varchar', default: 'active' })
  status: TenantStatus;

  @OneToOne(() => Subscription, (subscription) => subscription.tenant)
  subscription: Subscription | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
