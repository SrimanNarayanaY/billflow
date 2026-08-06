import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  In,
  IsNull,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Subscription } from '../common/entities/subscription.entity';
import { Plan } from '../common/entities/plan.entity';
import { Invoice } from '../common/entities/invoice.entity';
import { InvoiceLineItem } from '../common/entities/invoice-line-item.entity';
import { UsageEvent } from '../common/entities/usage-event.entity';
import { UsageCacheService } from '../usage/usage-cache.service';
import { PaymentsService } from '../payments/payments.service';
import { addMonths } from '../common/utils/date.util';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemsRepository: Repository<InvoiceLineItem>,
    private readonly usageCache: UsageCacheService,
    private readonly paymentsService: PaymentsService,
    private readonly dataSource: DataSource,
  ) {}

  /** Subscriptions whose current cycle has ended and are due for an invoice. */
  async findDueSubscriptions(now = new Date()): Promise<Subscription[]> {
    const repo = this.dataSource.getRepository(Subscription);
    return repo.find({
      where: [
        { status: 'active' },
        { status: 'canceled', cancelAtPeriodEnd: true },
      ],
      relations: { tenant: false },
    }).then((subs) =>
      subs.filter((sub) => sub.currentPeriodEnd.getTime() <= now.getTime()),
    );
  }

  /**
   * Close every due cycle: flush usage counters to Postgres, build line items
   * (subscription + usage overage + pending proration), create the invoice,
   * advance the period and auto-charge. Row-level locking (`FOR UPDATE`)
   * guarantees a cycle is only ever closed once even under concurrent runners.
   */
  async generateDueInvoices(now = new Date()): Promise<Invoice[]> {
    const due = await this.findDueSubscriptions(now);
    const invoices: Invoice[] = [];
    for (const subscription of due) {
      const invoice = await this.closeCycle(subscription.id, now);
      if (invoice) invoices.push(invoice);
    }
    if (invoices.length > 0) {
      this.logger.log(`Generated ${invoices.length} invoice(s) at cycle close`);
    }
    return invoices;
  }

  async closeCycle(subscriptionId: string, now = new Date()): Promise<Invoice | null> {
    return this.dataSource.transaction(async (manager) => {
      const subscription = await manager.findOne(Subscription, {
        where: { id: subscriptionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!subscription) return null;
      if (subscription.currentPeriodEnd.getTime() > now.getTime()) return null;
      if (subscription.status !== 'active' && !(subscription.status === 'canceled' && subscription.cancelAtPeriodEnd)) {
        return null;
      }

      const tenantId = subscription.tenantId;
      const periodStart = subscription.currentPeriodStart;
      const periodEnd = subscription.currentPeriodEnd;
      const cycleKey = periodStart.toISOString();

      // 1. Flush live counters into Postgres as the source of truth.
      const flushed = await this.usageCache.flush(tenantId, cycleKey);
      if (flushed.length > 0) {
        await manager.save(
          UsageEvent,
          flushed.map((e) =>
            manager.create(UsageEvent, {
              tenantId,
              metric: e.metric,
              quantity: e.quantity,
              recordedAt: now,
            }),
          ),
        );
      }

      // 2. Aggregate usage for the cycle (flush + any previously persisted rows).
      const events = await manager.find(UsageEvent, {
        where: { tenantId, recordedAt: Between(periodStart, periodEnd) },
      });
      const totals: Record<string, number> = {};
      for (const event of events) {
        totals[event.metric] = (totals[event.metric] ?? 0) + event.quantity;
      }

      // 3. Build line items.
      const plan = await manager.findOne(Plan, { where: { id: subscription.planId } });
      if (!plan) throw new NotFoundException('Plan not found');
      const periodLabel = `${periodStart.toISOString().slice(0, 10)} -> ${periodEnd.toISOString().slice(0, 10)}`;
      const lineItems: Partial<InvoiceLineItem>[] = [
        {
          subscriptionId: subscription.id,
          tenantId,
          periodStart,
          type: 'subscription',
          description: `${plan.name} subscription (${periodLabel})`,
          quantity: 1,
          amountMinor: plan.price,
        },
      ];

      for (const [metric, limit] of Object.entries(plan.usageLimits)) {
        const used = totals[metric] ?? 0;
        const overagePrice = plan.overagePrices?.[metric];
        if (used > limit && overagePrice) {
          const overageQty = used - limit;
          lineItems.push({
            subscriptionId: subscription.id,
            tenantId,
            periodStart,
            type: 'usage',
            description: `${metric} overage (${overageQty} over ${limit} limit)`,
            quantity: overageQty,
            amountMinor: overageQty * overagePrice,
          });
        }
      }

      let total = lineItems.reduce((sum, item) => sum + (item.amountMinor ?? 0), 0);

      // 4. Create the invoice and attach pending proration line items.
      const invoice = manager.create(Invoice, {
        tenantId,
        periodStart,
        periodEnd,
        status: 'open',
        totalAmount: 0,
        dueAt: new Date(periodEnd.getTime() + 7 * 86_400_000),
      });
      await manager.save(Invoice, invoice);

      const prorations = await manager.find(InvoiceLineItem, {
        where: {
          subscriptionId: subscription.id,
          invoiceId: IsNull(),
          periodStart: MoreThanOrEqual(periodStart),
        },
      });
      for (const proration of prorations) {
        proration.invoiceId = invoice.id;
        await manager.save(InvoiceLineItem, proration);
        total += proration.amountMinor;
      }

      for (const item of lineItems) {
        const entity = manager.create(InvoiceLineItem, { ...item, invoiceId: invoice.id });
        await manager.save(InvoiceLineItem, entity);
      }

      invoice.totalAmount = total;
      await manager.save(Invoice, invoice);

      // 5. Advance the billing cycle (or finalize a cancel-at-period-end).
      if (subscription.cancelAtPeriodEnd) {
        subscription.status = 'canceled';
        await manager.save(Subscription, subscription);
      } else {
        subscription.currentPeriodStart = periodEnd;
        subscription.currentPeriodEnd = addMonths(periodEnd, 1);
        await manager.save(Subscription, subscription);
        await this.usageCache.setCycleKey(tenantId, subscription.currentPeriodStart.toISOString());
      }

      // 6. Auto-charge (delivered through the simulated gateway/webhook pipeline).
      await this.paymentsService.payInvoice(invoice.id, undefined, { outcome: 'success' });

      return invoice;
    });
  }

  async listByTenant(tenantId: string): Promise<Invoice[]> {
    return this.invoicesRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async listAll(): Promise<Invoice[]> {
    return this.invoicesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async detail(id: string): Promise<{ invoice: Invoice; lineItems: InvoiceLineItem[] }> {
    const invoice = await this.invoicesRepository.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const lineItems = await this.lineItemsRepository.find({
      where: { invoiceId: id },
      order: { createdAt: 'ASC' },
    });
    return { invoice, lineItems };
  }

  async markPaid(id: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    return this.invoicesRepository.save(invoice);
  }
}
