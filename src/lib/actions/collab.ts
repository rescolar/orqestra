"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CollabService } from "@/lib/services/collab.service";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function getOrCreateCollabCode(eventId: string) {
  const user = await requireAuth();
  return CollabService.getOrCreateCollabCode(eventId, {
    userId: user.id,
    role: user.role,
  });
}

export async function resolveCollabCode(code: string) {
  return CollabService.resolveCollabCode(code);
}

export async function joinAsCollaborator(code: string) {
  const user = await requireAuth();
  const result = await CollabService.joinAsCollaborator(user.id, code);
  revalidatePath("/dashboard");
  return result;
}

export async function getCollaborators(eventId: string) {
  await requireAuth();
  return CollabService.getCollaborators(eventId);
}

export async function removeCollaborator(eventId: string, userId: string) {
  const user = await requireAuth();
  await CollabService.removeCollaborator(eventId, userId, {
    userId: user.id,
    role: user.role,
  });
  revalidatePath(`/events/${eventId}/collaborators`);
}
