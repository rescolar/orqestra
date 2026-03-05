"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ScheduleService, type BlockAssignments } from "@/lib/services/schedule.service";
import { ScheduleBlockType } from "@prisma/client";

export async function getSchedule(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return ScheduleService.getSchedule(eventId, session.user.id);
}

export async function createBlock(
  eventId: string,
  data: { day_index: number; type: ScheduleBlockType }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const block = await ScheduleService.createBlock(eventId, session.user.id, data);
  revalidatePath(`/events/${eventId}/schedule`);
  return block;
}

export async function moveBlock(
  blockId: string,
  eventId: string,
  direction: "up" | "down"
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await ScheduleService.moveBlock(blockId, session.user.id, direction);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function deleteBlock(blockId: string, eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await ScheduleService.deleteBlock(blockId, session.user.id);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function createActivity(
  blockId: string,
  eventId: string,
  data: { title?: string }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const activity = await ScheduleService.createActivity(
    blockId,
    session.user.id,
    data
  );
  revalidatePath(`/events/${eventId}/schedule`);
  return activity;
}

export async function updateActivityField(
  activityId: string,
  eventId: string,
  data: { title?: string; description?: string | null; time_label?: string | null }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await ScheduleService.updateActivity(activityId, session.user.id, data);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function deleteActivity(
  activityId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await ScheduleService.deleteActivity(activityId, session.user.id);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function assignToActivity(
  activityId: string,
  eventPersonId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await ScheduleService.assignToActivity(activityId, eventPersonId, session.user.id);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function unassignFromActivity(
  activityId: string,
  eventPersonId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await ScheduleService.unassignFromActivity(activityId, eventPersonId, session.user.id);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function getBlockAssignments(
  blockId: string,
  eventId: string
): Promise<BlockAssignments> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return ScheduleService.getBlockAssignments(blockId, session.user.id);
}
