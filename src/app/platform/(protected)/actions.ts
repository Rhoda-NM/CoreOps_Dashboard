"use server";
import { approveTaxConfiguration } from "@/server/commercial/tax";
import { reconcilePaystack, registerPaystackMerchant } from "@/server/payments/paystack";
import { revalidatePath } from "next/cache";
import * as commercial from "@/server/commercial/service";
import { commercialMessage } from "@/server/commercial/action-result";
import type { CommercialState } from "@/components/commercial/CommercialForm";
export async function platformAction(_state: CommercialState, data: FormData): Promise<CommercialState> {
  const v = (name: string) => String(data.get(name) ?? "");
  try {
    const reason = v("reason");
    switch (v("operation")) {
      case "vat": await approveTaxConfiguration({ version: Number(v("version")), registrationStatus: v("registrationStatus"), registrationReference: v("registrationReference"), effectiveFrom: v("effectiveFrom"), rate: v("rate"), treatments: data.getAll("treatments").map(String), approval: reason }); break;
      case "reconcilePaystack": await reconcilePaystack(v("reference")); break;
      case "paystackAccount": await registerPaystackMerchant(v("mode") as "test" | "live", reason); break;
      case "review": await commercial.reviewRequest(v("id"), { amount: v("amount"), tax: v("tax"), memberLimit: Number(v("memberLimit")), accountId: v("accountId"), notes: reason }); break;
      case "verify": await commercial.verifyPayment(v("id"), { amount: v("amount"), reference: v("reference"), ledgerEntryId: v("ledgerEntryId"), receivedAt: v("receivedAt"), notes: reason }); break;
      case "rejectPayment": await commercial.rejectPayment(v("id"), reason); break;
      case "reverse": await commercial.reverseReceipt(v("id"), reason); break;
      case "overpayment": await commercial.reviewOverpayment(v("id"), reason); break;
      case "activate": await commercial.activateSubscription(v("id"), reason, v("recoveryId") || undefined); break;
      case "reject": await commercial.closeRequest(v("id"), true, reason); break;
      case "status": await commercial.setWorkspaceStatus(v("id"), v("status") as "ACTIVE" | "SUSPENDED" | "CLOSED", reason); break;
      case "publish": await commercial.publishOffer(v("id"), reason, v("published") === "true"); break;
      case "account": await commercial.registerReceivingAccount({ label: v("label"), method: v("method"), accountIdentifier: v("accountIdentifier"), instructions: v("instructions"), approval: reason }); break;
      case "offer": await commercial.createOffer({ plan: v("plan"), interval: v("interval"), version: Number(v("version")), name: v("name"), amount: v("amount"), memberLimit: v("memberLimit") ? Number(v("memberLimit")) : null, projectLimit: v("projectLimit") ? Number(v("projectLimit")) : null, invitationsEnabled: v("invitationsEnabled") === "true", taxTreatment: v("taxTreatment"), features: Object.fromEntries(["clients", "projects", "tasks", "invoices", "dashboard"].map(f => [f, data.get(f) === "on"])) }); break;
      default: return { error: "Unknown platform action." };
    }
    revalidatePath("/platform", "layout"); revalidatePath("/w", "layout");
    return { success: "Saved and recorded in the audit history." };
  } catch (error) { return { error: commercialMessage(error) }; }
}
