"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EconomicsService, type CostManagerSaveInput } from "@/lib/services/economics.service";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function saveEventCostManager(
  eventId: string,
  data: CostManagerSaveInput
) {
  const ctx = await requireAuth();
  const result = await EconomicsService.saveCostManagerData(eventId, ctx, data);
  revalidatePath(`/events/${eventId}/detail`);
  revalidatePath(`/events/${eventId}/setup`);
  revalidatePath(`/events/${eventId}/economics`);
  return result;
}
