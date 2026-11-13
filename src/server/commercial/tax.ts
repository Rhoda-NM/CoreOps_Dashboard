import "server-only";
import { stagingRequested } from "../staging/config";
import { Prisma, type TaxTreatment, type TaxConfiguration } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { CommercialError, money } from "./policy";
import { requirePlatform } from "./platform-auth";

export function calculateTax(amount: Prisma.Decimal, treatment: TaxTreatment, config: TaxConfiguration | null, now = new Date()) {
  const allowed = config && Array.isArray(config.allowedTreatments) && config.allowedTreatments.includes(treatment);
  const registered = !!config && config.registrationStatus === "REGISTERED" && !!config.registrationReference && config.effectiveFrom <= now;
  if (config && !allowed) throw new CommercialError("This tax treatment is not approved by the current VAT configuration.");
  if (treatment === "NON_VAT_REGISTERED" && (!config || config.registrationStatus !== "NOT_REGISTERED" || !config.rate.isZero())) throw new CommercialError("Non-VAT-registered sales require an approved non-registration configuration.");
  const rate = registered && treatment !== "EXEMPT" && treatment !== "NON_VAT_REGISTERED" ? config.rate : new Prisma.Decimal(0);
  const factor = rate.div(100);
  const net = treatment === "INCLUSIVE" ? amount.div(factor.add(1)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP) : amount;
  const tax = treatment === "INCLUSIVE" ? amount.sub(net) : net.mul(factor).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const payable = net.add(tax);
  return { net, tax, payable, rate, snapshot: { synthetic: config?.synthetic ?? false, configurationId: config?.id ?? null, version: config?.version ?? null, registrationStatus: config?.registrationStatus ?? "UNVERIFIED", registrationReference: config?.registrationReference ?? null, effectiveFrom: config?.effectiveFrom.toISOString() ?? null, approvalReference: config?.approvalReference ?? null, treatment, rate: rate.toFixed(4), net: net.toFixed(2), tax: tax.toFixed(2), payable: payable.toFixed(2), vatCharged: tax.gt(0) } };
}
export async function currentTaxConfiguration(db: Prisma.TransactionClient = prisma, now = new Date()) {
  return db.taxConfiguration.findFirst({ where: { effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" } });
}
export async function approveTaxConfiguration(input: { version: number; registrationStatus: string; registrationReference?: string; effectiveFrom: string; rate: string; treatments: string[]; approval: string }) {
  const actor = await requirePlatform("catalog");
  const registrationStatus = z.enum(["UNVERIFIED", "NOT_REGISTERED", "REGISTERED", "DEREGISTERED"]).parse(input.registrationStatus);
  z.string().datetime({ offset: true }).parse(input.effectiveFrom);
  const effectiveFrom = new Date(input.effectiveFrom);
  if (effectiveFrom < new Date()) throw new CommercialError("Tax changes must be scheduled prospectively. Historical quotes are never recalculated.");
  if (!/^\d{1,2}(?:\.\d{1,4})?$/.test(input.rate)) throw new CommercialError("Enter an approved rate from 0 to less than 100 percent.");
  const rate = new Prisma.Decimal(input.rate);
  const treatments = z.array(z.enum(["INCLUSIVE", "EXCLUSIVE", "EXEMPT", "NON_VAT_REGISTERED"])).min(1).parse(input.treatments);
  if (treatments.includes("NON_VAT_REGISTERED") && registrationStatus !== "NOT_REGISTERED") throw new CommercialError("Non-VAT-registered treatment requires an explicit non-registration configuration.");
  const approval = z.string().trim().min(10).max(1000).parse(input.approval);
  const registrationReference = input.registrationReference?.trim() || null;
  if (registrationStatus !== "REGISTERED" && !rate.isZero()) throw new CommercialError("VAT cannot be enabled without verified registration.");
  if (registrationStatus === "REGISTERED" && !registrationReference) throw new CommercialError("Verified VAT registration evidence is required.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${actor.id} FOR UPDATE`;
    const admin = await tx.platformAdmin.findUniqueOrThrow({ where: { id: actor.id } });
    if (!admin.active || admin.role !== "SUPER_ADMIN") throw new CommercialError("Active super administrator authorization is required.");
    await tx.$executeRaw`LOCK TABLE "TaxConfiguration" IN SHARE ROW EXCLUSIVE MODE`;
    const last = await tx.taxConfiguration.findFirst({ orderBy: { version: "desc" } });
    if (last && (input.version <= last.version || effectiveFrom <= last.effectiveFrom)) throw new CommercialError("Tax versions and effective dates must advance monotonically.");
    const result = await tx.taxConfiguration.create({ data: { synthetic: stagingRequested(), version: z.number().int().positive().parse(input.version), registrationStatus, registrationReference, effectiveFrom, rate, allowedTreatments: treatments, approvalReference: approval, approvedById: admin.id } });
    await tx.platformAuditEvent.create({ data: { actorAdminId: admin.id, action: "VAT_CONFIGURATION_APPROVED", resourceType: "TaxConfiguration", resourceId: result.id, reason: approval, metadata: { version: result.version, registrationStatus, effectiveFrom: effectiveFrom.toISOString(), rate: rate.toString() } } });
    return result;
  });
}
export async function taxConfigurationHistory() { await requirePlatform("catalog"); return prisma.taxConfiguration.findMany({ orderBy: { version: "desc" }, take: 50 }); }
export function expectedTaxInput(value: string) { return value === "0" || value === "0.00" ? new Prisma.Decimal(0) : money(value); }
