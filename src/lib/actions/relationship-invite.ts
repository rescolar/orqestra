"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RelationshipInviteService } from "@/lib/services/relationship-invite.service";
import type { RelationshipType } from "@prisma/client";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function createRelationshipInvite(
  eventId: string,
  type: RelationshipType
) {
  const user = await requireAuth();
  const invite = await RelationshipInviteService.createInvite(
    user.id,
    eventId,
    type
  );
  revalidatePath(`/my-events/${eventId}`);
  return invite;
}

export async function resolveRelationshipToken(token: string) {
  return RelationshipInviteService.resolveToken(token);
}

export async function acceptRelationshipInvite(token: string) {
  const user = await requireAuth();
  return RelationshipInviteService.acceptInvite(token, user.id);
}

export async function declineRelationshipInvite(token: string) {
  const user = await requireAuth();
  await RelationshipInviteService.declineInvite(token, user.id);
}

export async function getMyRelationshipInvites(eventId: string) {
  const user = await requireAuth();
  return RelationshipInviteService.getInvitesByEvent(eventId, user.id);
}
