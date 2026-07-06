"use server";

import { ApiError, createCheckout } from "@/lib/api";
import { redirect } from "next/navigation";

export async function checkoutAction(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  if (!planId) return;

  let confirmationUrl: string;
  try {
    const checkout = await createCheckout(planId);
    confirmationUrl = checkout.confirmationUrl;
  } catch (e) {
    if (e instanceof ApiError) {
      const code =
        e.status === 503
          ? "payment_provider_not_configured"
          : e.status === 403
            ? "payment_forbidden"
            : "checkout_failed";
      redirect(`/payments?error=${code}`);
    }
    redirect("/payments?error=checkout_failed");
  }

  redirect(confirmationUrl);
}
