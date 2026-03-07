"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReceptionService } from "@/lib/services/reception.service";
import { revalidatePath } from "next/cache";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function getReceptionData(eventId: string) {
  const ctx = await requireAuth();
  return ReceptionService.getReceptionData(eventId, ctx);
}

export async function checkIn(eventPersonId: string) {
  const ctx = await requireAuth();
  await ReceptionService.checkIn(eventPersonId, ctx);
  revalidatePath("/events");
}

export async function undoCheckIn(eventPersonId: string) {
  const ctx = await requireAuth();
  await ReceptionService.undoCheckIn(eventPersonId, ctx);
  revalidatePath("/events");
}

export async function getReceptionPrintData(eventId: string) {
  const ctx = await requireAuth();
  return ReceptionService.getReceptionPrintData(eventId, ctx);
}
