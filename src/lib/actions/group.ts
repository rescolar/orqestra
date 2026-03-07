"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { GroupService } from "@/lib/services/group.service";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function createRelationship(
  eventId: string,
  personAId: string,
  personBId: string
) {
  const ctx = await requireAuth();

  // Look up both persons' current group
  const [personA, personB] = await Promise.all([
    db.eventPerson.findFirst({
      where: { id: personAId, event_id: eventId },
      select: { group_id: true },
    }),
    db.eventPerson.findFirst({
      where: { id: personBId, event_id: eventId },
      select: { group_id: true },
    }),
  ]);

  if (!personA || !personB) throw new Error("Persona no encontrada");

  if (personA.group_id && personB.group_id) {
    if (personA.group_id === personB.group_id) return;
    await GroupService.removeMemberFromGroup(personBId, ctx);
    await GroupService.addMemberToGroup(personA.group_id, personBId, ctx);
  } else if (personA.group_id) {
    await GroupService.addMemberToGroup(personA.group_id, personBId, ctx);
  } else if (personB.group_id) {
    await GroupService.addMemberToGroup(personB.group_id, personAId, ctx);
  } else {
    await GroupService.createGroup(eventId, ctx, [personAId, personBId]);
  }

  revalidatePath(`/events/${eventId}/board`);
}

export async function removeMemberFromGroup(
  eventPersonId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  await GroupService.removeMemberFromGroup(eventPersonId, ctx);
  revalidatePath(`/events/${eventId}/board`);
}

export async function toggleInseparable(
  eventPersonId: string,
  partnerId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  await GroupService.toggleInseparable(eventPersonId, partnerId, ctx);
  revalidatePath(`/events/${eventId}/board`);
}
