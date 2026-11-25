export type BillingPeriodKey = string;

export function currentBillingPeriodKey(now = new Date()): BillingPeriodKey {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function assertBillingPeriodKey(value: string): BillingPeriodKey {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new Error(`Invalid billing period key: ${value}`);
  }
  return value;
}

export function nextBillingPeriodKey(period: BillingPeriodKey): BillingPeriodKey {
  const [y, m] = period.split("-").map(Number);
  const month = (m ?? 1) + 1;
  if (month > 12) return `${(y ?? 1970) + 1}-01`;
  return `${y}-${String(month).padStart(2, "0")}`;
}
