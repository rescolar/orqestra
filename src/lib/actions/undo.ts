"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UndoService } from "@/lib/services/undo.service";
import { revalidatePath } from "next/cache";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function undoLastAction(eventId: string) {
  const ctx = await requireAuth();
  const result = await UndoService.undoLast(eventId, ctx);
  revalidatePath(`/events/${eventId}/board`);
  return result;
}

export async function hasUndoEntries(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return UndoService.hasUndoEntries(eventId);
}
