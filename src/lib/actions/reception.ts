"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReceptionService } from "@/lib/services/reception.service";
import { revalidatePath } from "next/cache";

export async function getReceptionData(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return ReceptionService.getReceptionData(eventId, session.user.id);
}

export async function checkIn(eventPersonId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await ReceptionService.checkIn(eventPersonId, session.user.id);
  revalidatePath("/events");
}

export async function undoCheckIn(eventPersonId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await ReceptionService.undoCheckIn(eventPersonId, session.user.id);
  revalidatePath("/events");
}

export async function getReceptionPrintData(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return ReceptionService.getReceptionPrintData(eventId, session.user.id);
}
