"use server";
import { reconcileOwnPaystack } from "@/server/payments/paystack";
import { paymentReturnPath } from "@/server/payments/payment-return";
import { revalidatePath } from "next/cache";
export async function checkOwnPayment(reference: string) {
  try {
    const result = await reconcileOwnPaystack(reference);
    const path = await paymentReturnPath(reference);
    revalidatePath(path);
    return { activated: result.status === "ACTIVATED" && result.operational, path, message: result.status === "ACTIVATED" && result.operational ? "Payment verified. Your subscription is active." : "Payment recorded. This subscription requires review before access is enabled." };
  } catch {
    return { activated: false, path: null, message: "Payment is not yet confirmed. Retry this check or contact support. Do not pay again while this reference is unresolved." };
  }
}
