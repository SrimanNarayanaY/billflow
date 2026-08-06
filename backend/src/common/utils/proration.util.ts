import { daysBetween } from './date.util';

export interface ProrationInput {
  oldPlanPriceMinor: number;
  newPlanPriceMinor: number;
  periodStart: Date;
  periodEnd: Date;
  changeDate: Date;
}

export interface ProrationResult {
  daysInPeriod: number;
  daysRemaining: number;
  oldPlanProratedMinor: number;
  newPlanProratedMinor: number;
  netMinor: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Day-based proration.
 *
 * When a tenant changes plans mid-cycle the remaining value of the old plan is
 * credited back and the remaining value of the new plan is charged. The net is:
 *
 *   net = round(newPrice * daysRemaining / daysInPeriod)
 *       - round(oldPrice * daysRemaining / daysInPeriod)
 *
 * A positive net is an additional charge (upgrade), a negative net is a credit
 * (downgrade). Money is expressed in minor units (paise) and rounded half-up.
 */
export function calculateProration(input: ProrationInput): ProrationResult {
  const { oldPlanPriceMinor, newPlanPriceMinor, periodStart, periodEnd, changeDate } = input;

  const daysInPeriod = Math.max(daysBetween(periodStart, periodEnd), 1);
  const daysRemaining = clamp(daysBetween(changeDate, periodEnd), 0, daysInPeriod);

  const oldPlanProratedMinor = Math.round((oldPlanPriceMinor * daysRemaining) / daysInPeriod);
  const newPlanProratedMinor = Math.round((newPlanPriceMinor * daysRemaining) / daysInPeriod);

  return {
    daysInPeriod,
    daysRemaining,
    oldPlanProratedMinor,
    newPlanProratedMinor,
    netMinor: newPlanProratedMinor - oldPlanProratedMinor,
  };
}
