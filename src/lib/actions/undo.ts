"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UndoService } from "@/lib/services/undo.service";
import { revalidatePath } from "next/cache";

export async function undoLastAction(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await UndoService.undoLast(eventId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
  return result;
}

export async function hasUndoEntries(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return UndoService.hasUndoEntries(eventId);
}
