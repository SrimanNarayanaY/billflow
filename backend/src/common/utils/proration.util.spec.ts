import { calculateProration } from './proration.util';

describe('calculateProration', () => {
  const periodStart = new Date('2024-01-01T00:00:00.000Z');
  const periodEnd = new Date('2024-02-01T00:00:00.000Z');

  it('counts the full number of days in a 31-day month', () => {
    const result = calculateProration({
      oldPlanPriceMinor: 199_900,
      newPlanPriceMinor: 999_900,
      periodStart,
      periodEnd,
      changeDate: new Date('2024-01-16T00:00:00.000Z'),
    });
    expect(result.daysInPeriod).toBe(31);
    expect(result.daysRemaining).toBe(16);
  });

  it('charges the prorated difference on a mid-cycle upgrade', () => {
    const result = calculateProration({
      oldPlanPriceMinor: 199_900,
      newPlanPriceMinor: 999_900,
      periodStart,
      periodEnd,
      changeDate: new Date('2024-01-16T00:00:00.000Z'),
    });
    expect(result.oldPlanProratedMinor).toBe(103_174);
    expect(result.newPlanProratedMinor).toBe(516_077);
    expect(result.netMinor).toBe(412_903);
  });

  it('credits the prorated difference on a mid-cycle downgrade', () => {
    const result = calculateProration({
      oldPlanPriceMinor: 999_900,
      newPlanPriceMinor: 199_900,
      periodStart,
      periodEnd,
      changeDate: new Date('2024-01-16T00:00:00.000Z'),
    });
    expect(result.netMinor).toBe(-412_903);
  });

  it('returns zero when the plan does not change', () => {
    const result = calculateProration({
      oldPlanPriceMinor: 199_900,
      newPlanPriceMinor: 199_900,
      periodStart,
      periodEnd,
      changeDate: new Date('2024-01-16T00:00:00.000Z'),
    });
    expect(result.netMinor).toBe(0);
  });

  it('charges the full difference when upgrading on the first day of the cycle', () => {
    const result = calculateProration({
      oldPlanPriceMinor: 199_900,
      newPlanPriceMinor: 999_900,
      periodStart,
      periodEnd,
      changeDate: new Date('2024-01-01T00:00:00.000Z'),
    });
    expect(result.daysRemaining).toBe(31);
    expect(result.netMinor).toBe(800_000);
  });

  it('prorates a single day when changing on the last day of the month', () => {
    const result = calculateProration({
      oldPlanPriceMinor: 199_900,
      newPlanPriceMinor: 999_900,
      periodStart,
      periodEnd,
      changeDate: new Date('2024-01-31T00:00:00.000Z'),
    });
    expect(result.daysRemaining).toBe(1);
    expect(result.netMinor).toBe(25_807);
  });

  it('handles leap-year February (29 days)', () => {
    const result = calculateProration({
      oldPlanPriceMinor: 199_900,
      newPlanPriceMinor: 999_900,
      periodStart: new Date('2024-02-01T00:00:00.000Z'),
      periodEnd: new Date('2024-03-01T00:00:00.000Z'),
      changeDate: new Date('2024-02-15T00:00:00.000Z'),
    });
    expect(result.daysInPeriod).toBe(29);
    expect(result.daysRemaining).toBe(15);
  });

  it('handles non-leap February (28 days)', () => {
    const result = calculateProration({
      oldPlanPriceMinor: 199_900,
      newPlanPriceMinor: 999_900,
      periodStart: new Date('2023-02-01T00:00:00.000Z'),
      periodEnd: new Date('2023-03-01T00:00:00.000Z'),
      changeDate: new Date('2023-02-10T00:00:00.000Z'),
    });
    expect(result.daysInPeriod).toBe(28);
    expect(result.daysRemaining).toBe(19);
  });
});
