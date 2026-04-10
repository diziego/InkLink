"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { getProviderProfileId } from "@/lib/provider/orders";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

export async function acceptAssignmentAction(formData: FormData) {
  const user = await requireRole("provider");
  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  if (!assignmentId) throw new Error("Missing assignmentId");

  const providerProfileId = await getProviderProfileId(user.id);
  if (!providerProfileId) throw new Error("Provider profile not found");

  const supabase = createSupabaseServiceRoleClient();

  // Verify the assignment belongs to this provider before mutating
  const checkResult = await (supabase.from("order_assignments") as any)
    .select("id, merchant_order_id")
    .eq("id", assignmentId)
    .eq("provider_profile_id", providerProfileId)
    .eq("status", "pending")
    .maybeSingle();

  if (checkResult.error) throw new Error(checkResult.error.message);
  const assignment = checkResult.data as {
    id: string;
    merchant_order_id: string;
  } | null;
  if (!assignment) throw new Error("Assignment not found or already responded");

  // Accept the assignment
  const updateAssignment = await (supabase.from("order_assignments") as any)
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (updateAssignment.error) throw new Error(updateAssignment.error.message);

  // Move the order to accepted
  const updateOrder = await (supabase.from("merchant_orders") as any)
    .update({ status: "accepted" })
    .eq("id", assignment.merchant_order_id);

  if (updateOrder.error) throw new Error(updateOrder.error.message);

  revalidatePath("/provider");
}

export async function declineAssignmentAction(formData: FormData) {
  const user = await requireRole("provider");
  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  if (!assignmentId) throw new Error("Missing assignmentId");

  const providerProfileId = await getProviderProfileId(user.id);
  if (!providerProfileId) throw new Error("Provider profile not found");

  const supabase = createSupabaseServiceRoleClient();

  // Verify ownership before mutating
  const checkResult = await (supabase.from("order_assignments") as any)
    .select("id")
    .eq("id", assignmentId)
    .eq("provider_profile_id", providerProfileId)
    .eq("status", "pending")
    .maybeSingle();

  if (checkResult.error) throw new Error(checkResult.error.message);
  if (!checkResult.data) throw new Error("Assignment not found or already responded");

  const updateResult = await (supabase.from("order_assignments") as any)
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (updateResult.error) throw new Error(updateResult.error.message);

  revalidatePath("/provider");
}
