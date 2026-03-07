"use server";

import { auth } from "@/lib/auth";
import { CentroShareService } from "@/lib/services/centro-share.service";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return { userId: session.user.id, role: session.user.role };
}

export async function getOrCreateCentroToken(eventId: string) {
  const ctx = await requireAuth();
  return CentroShareService.getOrCreateToken(eventId, ctx);
}

export async function revokeCentroToken(eventId: string) {
  const ctx = await requireAuth();
  await CentroShareService.revokeToken(eventId, ctx);
}

export async function regenerateCentroToken(eventId: string) {
  const ctx = await requireAuth();
  return CentroShareService.regenerateToken(eventId, ctx);
}

export async function getCentroTokenInfo(eventId: string) {
  const ctx = await requireAuth();
  return CentroShareService.getTokenInfo(eventId, ctx);
}
