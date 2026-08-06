import { randomUUID } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { PaymentAttempt } from '../common/entities/payment-attempt.entity';
import { Invoice } from '../common/entities/invoice.entity';

export type SimulatedOutcome = 'success' | 'failed';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentAttempt)
    private readonly attemptsRepository: Repository<PaymentAttempt>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectQueue('payments') private readonly paymentsQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a payment attempt for an invoice and schedule the simulated
   * provider response. In production the real Razorpay webhook would be the
   * response; the simulator just makes the demo self-contained.
   */
  async payInvoice(
    invoiceId: string,
    tenantId?: string,
    options?: { outcome?: SimulatedOutcome; reason?: string },
  ): Promise<PaymentAttempt> {
    const invoice = await this.invoicesRepository.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (tenantId && invoice.tenantId !== tenantId) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status === 'paid') throw new ConflictException('Invoice already paid');
    if (invoice.status === 'void') throw new ConflictException('Invoice is void');

    const attemptNumber =
      (await this.attemptsRepository.count({ where: { invoiceId } })) + 1;
    const providerRef = `pay_${randomUUID().replace(/-/g, '').slice(0, 18)}`;

    const attempt = this.attemptsRepository.create({
      invoiceId,
      providerRef,
      status: 'pending',
      attemptNumber,
    });
    await this.attemptsRepository.save(attempt);

    await this.paymentsQueue.add(
      'payment-simulate',
      {
        attemptId: attempt.id,
        outcome: options?.outcome ?? 'success',
        reason: options?.reason,
      },
      {
        delay: this.configService.get<number>('paymentSimDelayMs'),
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    return attempt;
  }

  async findByProviderRef(providerRef: string): Promise<PaymentAttempt | null> {
    return this.attemptsRepository.findOne({ where: { providerRef } });
  }

  async markSucceeded(id: string): Promise<PaymentAttempt> {
    const attempt = await this.attemptsRepository.findOne({ where: { id } });
    if (!attempt) throw new NotFoundException('Payment attempt not found');
    attempt.status = 'succeeded';
    return this.attemptsRepository.save(attempt);
  }

  async markFailed(id: string, reason: string): Promise<PaymentAttempt> {
    const attempt = await this.attemptsRepository.findOne({ where: { id } });
    if (!attempt) throw new NotFoundException('Payment attempt not found');
    attempt.status = 'failed';
    attempt.failureReason = reason;
    return this.attemptsRepository.save(attempt);
  }
}
