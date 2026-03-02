"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { GroupService } from "@/lib/services/group.service";
import { db } from "@/lib/db";

export async function createRelationship(
  eventId: string,
  personAId: string,
  personBId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
    await GroupService.removeMemberFromGroup(personBId, session.user.id);
    await GroupService.addMemberToGroup(personA.group_id, personBId, session.user.id);
  } else if (personA.group_id) {
    await GroupService.addMemberToGroup(personA.group_id, personBId, session.user.id);
  } else if (personB.group_id) {
    await GroupService.addMemberToGroup(personB.group_id, personAId, session.user.id);
  } else {
    await GroupService.createGroup(eventId, session.user.id, [personAId, personBId]);
  }

  revalidatePath(`/events/${eventId}/board`);
}

export async function removeMemberFromGroup(
  eventPersonId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await GroupService.removeMemberFromGroup(eventPersonId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
}

export async function toggleInseparable(
  eventPersonId: string,
  partnerId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await GroupService.toggleInseparable(eventPersonId, partnerId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
}
