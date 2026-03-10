"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KitchenService } from "@/lib/services/kitchen.service";
import { revalidatePath } from "next/cache";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function getKitchenReport(eventId: string) {
  const ctx = await requireAuth();
  return KitchenService.getKitchenReport(eventId, ctx);
}

export async function updateMealFlags(
  eventPersonId: string,
  data: { arrives_for_dinner?: boolean; last_meal_lunch?: boolean }
) {
  const ctx = await requireAuth();
  await KitchenService.updateMealFlags(eventPersonId, ctx, data);
  revalidatePath("/events");
}

export async function updateMealAttendance(
  eventPersonId: string,
  dayIndex: number,
  field: "breakfast" | "lunch" | "dinner",
  value: boolean
) {
  const ctx = await requireAuth();
  await KitchenService.updateMealAttendance(eventPersonId, dayIndex, field, value, ctx);
  revalidatePath("/events");
}

export async function markAllDietaryNotified(eventId: string) {
  const ctx = await requireAuth();
  await KitchenService.markAllDietaryNotified(eventId, ctx);
  revalidatePath("/events");
}
