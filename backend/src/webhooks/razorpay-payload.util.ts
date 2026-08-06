import { createHmac, timingSafeEqual } from 'crypto';

export function razorpaySignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export function verifyRazorpaySignature(payload: string, signature: string, secret: string): boolean {
  const expected = razorpaySignature(payload, secret);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

export interface RazorpayPaymentEvent {
  event: string;
  amountMinor: number;
  failureReason?: string;
}

/**
 * Builds a payload that mirrors the structure of a real Razorpay webhook for a
 * payment event, so the exact same code path (including signature verification)
 * is exercised by the simulator and by the idempotency guard.
 */
export function buildRazorpayPaymentEvent(
  paymentId: string,
  orderId: string,
  options: RazorpayPaymentEvent,
): string {
  const captured = options.event === 'payment.captured';
  const entity: Record<string, unknown> = {
    id: paymentId,
    entity: 'payment',
    order_id: orderId,
    amount: options.amountMinor,
    currency: 'INR',
    status: captured ? 'captured' : 'failed',
  };
  if (!captured) {
    entity.error_description = options.failureReason ?? 'Payment failed';
    entity.error_reason = options.failureReason ?? 'card_declined';
  }

  return JSON.stringify({
    entity: 'event',
    account_id: 'acc_BillFlowDemo',
    event: captured ? 'payment.captured' : 'payment.failed',
    contains: ['payment'],
    payload: {
      payment: { entity },
    },
    created_at: Math.floor(Date.now() / 1000),
  });
}
