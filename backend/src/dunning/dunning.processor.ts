import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { Subscription } from '../common/entities/subscription.entity';
import { bullRedisConnection } from '../common/bull.util';
import { DunningService } from './dunning.service';

@Injectable()
export class DunningProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DunningProcessor.name);
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly dunningService: DunningService,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'dunning',
      async (job) => {
        const { subscriptionId, stage } = job.data;
        const subscription = await this.subscriptionsRepository.findOne({
          where: { id: subscriptionId },
        });
        if (!subscription) return;
        if (subscription.dunningStage !== stage) {
          this.logger.debug(`Stale dunning job ignored for ${subscriptionId} (stage ${stage})`);
          return;
        }
        if (subscription.status !== 'past_due') return;

        if (stage === 'suspend') {
          await this.dunningService.executeSuspend(subscription);
        } else {
          await this.dunningService.executeRetry(subscription, stage);
        }
      },
      { connection: bullRedisConnection(this.configService), concurrency: 5 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`dunning job failed: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
