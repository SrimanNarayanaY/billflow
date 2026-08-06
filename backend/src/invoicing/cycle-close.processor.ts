import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Worker } from 'bullmq';
import { bullRedisConnection } from '../common/bull.util';
import { InvoicingService } from './invoicing.service';

const CYCLE_CLOSE_SCHEDULER_ID = 'cycle-close-scheduler';

/**
 * Runs the "billing cycle close" job on a fixed schedule (every N ms) via a
 * BullMQ job scheduler, plus a dedicated worker that executes it.
 */
@Injectable()
export class CycleCloseProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CycleCloseProcessor.name);
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly invoicingService: InvoicingService,
    @InjectQueue('billing') private readonly billingQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    const every = this.configService.get<number>('cycleCloseIntervalMs');

    this.worker = new Worker(
      'billing',
      async (job) => {
        if (job.name !== 'cycle-close') return;
        await this.invoicingService.generateDueInvoices();
      },
      { connection: bullRedisConnection(this.configService), concurrency: 1 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(`cycle-close job failed: ${error.message}`);
    });

    await this.billingQueue.upsertJobScheduler(
      CYCLE_CLOSE_SCHEDULER_ID,
      { every },
      {
        name: 'cycle-close',
        data: {},
        opts: { removeOnComplete: 100, removeOnFail: 100 },
      },
    );
    this.logger.log(`Cycle-close scheduler started (every ${every}ms)`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.billingQueue.removeJobScheduler(CYCLE_CLOSE_SCHEDULER_ID);
    await this.worker?.close();
  }
}
