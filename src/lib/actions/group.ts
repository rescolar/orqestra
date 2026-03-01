"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { GroupService } from "@/lib/services/group.service";
import { GroupType } from "@prisma/client";

export async function getEventGroups(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return GroupService.getGroupsForEvent(eventId, session.user.id);
}

export async function createGroup(
  eventId: string,
  data: { name: string; type: GroupType; memberIds: string[] }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const group = await GroupService.createGroup(eventId, session.user.id, data);
  revalidatePath(`/events/${eventId}/board`);
  return group;
}

export async function addMemberToGroup(
  groupId: string,
  eventPersonId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await GroupService.addMemberToGroup(groupId, eventPersonId, session.user.id);
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

export async function deleteGroup(groupId: string, eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await GroupService.deleteGroup(groupId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
}

export async function updateGroupType(
  groupId: string,
  eventId: string,
  type: GroupType
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await GroupService.updateGroupType(groupId, session.user.id, type);
  revalidatePath(`/events/${eventId}/board`);
}
