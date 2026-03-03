"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KitchenService } from "@/lib/services/kitchen.service";
import { revalidatePath } from "next/cache";

export async function getKitchenReport(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return KitchenService.getKitchenReport(eventId, session.user.id);
}

export async function updateMealFlags(
  eventPersonId: string,
  data: { arrives_for_dinner?: boolean; last_meal_lunch?: boolean }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await KitchenService.updateMealFlags(eventPersonId, session.user.id, data);
  revalidatePath("/events");
}
