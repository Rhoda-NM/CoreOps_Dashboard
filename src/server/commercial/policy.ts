import { Prisma, type BillingInterval } from "@prisma/client";

export class CommercialError extends Error {}
export const DAY = 86_400_000;
export function money(value: string) {
  if (!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(value)) throw new CommercialError("Enter an exact positive amount with at most two decimal places.");
  const amount = new Prisma.Decimal(value);
  if (!amount.gt(0)) throw new CommercialError("Amount must be positive.");
  return amount;
}
export function periodEnd(start: Date, interval: BillingInterval, anchorDay = start.getUTCDate()) {
  const end = new Date(start);
  end.setUTCDate(1);
  if (interval === "ANNUAL") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(anchorDay, last));
  return end;
}
export function normalizeReference(value: string) {
  const ref = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9 /._-]{2,99}$/.test(ref)) throw new CommercialError("Enter a valid transaction reference.");
  return ref;
}
