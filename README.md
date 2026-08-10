# billflow
Multi-tenant subscription billing engine — idempotent payment webhooks, race-condition-safe usage metering, mid-cycle proration, and automated dunning. Built with NestJS, TypeORM, PostgreSQL, Redis, and BullMQ.

---

## Subscription Plan Changes & Proration Rules

When a tenant changes their subscription plan mid-cycle, **no immediate payment is required**. The system automatically handles adjustments using an inline proration mechanism:

1. **Prorated Calculation**:
   The backend computes adjustments based on the remaining days of the current billing cycle:
   - **Upgrade Proration**: Adds a prorated charge representing the value increase of the new plan for the remaining days.
   - **Downgrade Credit**: Creates a prorated credit line item representing the excess amount paid on the old plan for the remaining days.
2. **Next Invoice Injection**:
   The computed prorated amount is saved as a pending proration line item. When the next billing cycle is closed (either automatically or manually triggered), a dynamic invoice is generated combining the base plan price and the proration adjustments, at which point the final balance is paid.
