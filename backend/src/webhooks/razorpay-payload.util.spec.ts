import {
  buildRazorpayPaymentEvent,
  razorpaySignature,
  verifyRazorpaySignature,
} from './razorpay-payload.util';

describe('razorpay signature verification', () => {
  const secret = 'test-secret';
  const payload = buildRazorpayPaymentEvent('pay_abc123', 'order_xyz', {
    event: 'payment.captured',
    amountMinor: 199_900,
  });

  it('verifies a correctly signed payload', () => {
    const signature = razorpaySignature(payload, secret);
    expect(verifyRazorpaySignature(payload, signature, secret)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const signature = razorpaySignature(payload, secret);
    const tampered = payload.replace('pay_abc123', 'pay_EVIL000');
    expect(verifyRazorpaySignature(tampered, signature, secret)).toBe(false);
  });

  it('rejects a signature produced with a different secret', () => {
    const signature = razorpaySignature(payload, 'other-secret');
    expect(verifyRazorpaySignature(payload, signature, secret)).toBe(false);
  });

  it('produces a signature equal to the real HMAC-SHA256', () => {
    const { createHmac } = require('crypto');
    const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    expect(razorpaySignature(payload, secret)).toBe(expected);
  });
});
