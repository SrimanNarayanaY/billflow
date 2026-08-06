import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceLineItem } from '../common/entities/invoice-line-item.entity';
import { Subscription } from '../common/entities/subscription.entity';
import { calculateProration, ProrationResult } from '../common/utils/proration.util';

export interface ChangePlanProration {
  proration: ProrationResult;
  lineItem: InvoiceLineItem;
}

@Injectable()
export class ProrationService {
  constructor(
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemsRepository: Repository<InvoiceLineItem>,
  ) {}

  /**
   * Compute the prorated charge/credit when a subscription switches plans
   * mid-cycle and persist it as a pending proration line item. The line item is
   * attached to the next invoice generated for the subscription's current cycle.
   */
  async changePlanProration(
    subscription: Subscription,
    oldPlanPriceMinor: number,
    newPlanPriceMinor: number,
    changeDate: Date,
  ): Promise<ChangePlanProration> {
    const proration = calculateProration({
      oldPlanPriceMinor,
      newPlanPriceMinor,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      changeDate,
    });

    const description =
      proration.netMinor >= 0
        ? `Plan upgrade proration (${proration.daysRemaining}/${proration.daysInPeriod} days remaining)`
        : `Plan downgrade credit (${proration.daysRemaining}/${proration.daysInPeriod} days remaining)`;

    const lineItem = this.lineItemsRepository.create({
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      periodStart: subscription.currentPeriodStart,
      type: 'proration',
      description,
      quantity: proration.daysRemaining,
      amountMinor: proration.netMinor,
      invoiceId: null,
    });
    await this.lineItemsRepository.save(lineItem);

    return { proration, lineItem };
  }
}
