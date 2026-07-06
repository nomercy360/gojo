"use server";

import { createCheckout } from "@/lib/api";
import { redirect } from "next/navigation";

export async function checkoutAction(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  if (!planId) return;
  const checkout = await createCheckout(planId);
  redirect(checkout.confirmationUrl);
}
