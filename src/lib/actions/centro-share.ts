"use server";

import { auth } from "@/lib/auth";
import { CentroShareService } from "@/lib/services/centro-share.service";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return session.user.id;
}

export async function getOrCreateCentroToken(eventId: string) {
  const userId = await requireUserId();
  return CentroShareService.getOrCreateToken(eventId, userId);
}

export async function revokeCentroToken(eventId: string) {
  const userId = await requireUserId();
  await CentroShareService.revokeToken(eventId, userId);
}

export async function regenerateCentroToken(eventId: string) {
  const userId = await requireUserId();
  return CentroShareService.regenerateToken(eventId, userId);
}

export async function getCentroTokenInfo(eventId: string) {
  const userId = await requireUserId();
  return CentroShareService.getTokenInfo(eventId, userId);
}
