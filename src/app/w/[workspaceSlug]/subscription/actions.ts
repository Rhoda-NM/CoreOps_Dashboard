"use server";
import { initializePaystack } from "@/server/payments/paystack";
import { revalidatePath } from "next/cache";
import { workspacePath } from "@/server/auth/get-current-workspace";
import { acceptQuote, renameOnboardingWorkspace, submitPayment, submitRequest } from "@/server/commercial/service";
import { commercialMessage } from "@/server/commercial/action-result";
import type { CommercialState } from "@/components/commercial/CommercialForm";
export async function subscriptionAction(_state: CommercialState, data: FormData): Promise<CommercialState> {
  const value = (name: string) => String(data.get(name) ?? "");
  try {
    switch (value("operation")) {
      case "checkout": { const result = await initializePaystack(value("requestId"), value("idempotencyKey"), value("mode") as "test" | "live"); return result.authorizationUrl ? { paymentUrl: result.authorizationUrl, success: "Continue to the provider to complete payment. Activation requires separate approval." } : { error: "This reference requires reconciliation; do not create another payment." }; }
      case "request": await submitRequest(value("offerId"), value("type") as "INITIAL" | "RENEWAL" | "UPGRADE", value("idempotencyKey")); break;
      case "quote": await acceptQuote(value("requestId")); break;
      case "payment": await submitPayment(value("requestId"), { amount: value("amount"), reference: value("reference"), idempotencyKey: value("idempotencyKey") }); break;
      case "rename": await renameOnboardingWorkspace(value("name")); break;
      default: return { error: "Unknown subscription action." };
    }
    revalidatePath(await workspacePath("/subscription"));
    return { success: "Saved. Your current subscription status is shown below." };
  } catch (error) { return { error: commercialMessage(error) }; }
}
