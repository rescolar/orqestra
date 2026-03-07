"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ScheduleService, type BlockAssignments, type PrintDaySchedule } from "@/lib/services/schedule.service";
import { ScheduleBlockType } from "@prisma/client";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function getSchedule(eventId: string) {
  const ctx = await requireAuth();
  return ScheduleService.getSchedule(eventId, ctx);
}

export async function createBlock(
  eventId: string,
  data: { day_index: number; type: ScheduleBlockType }
) {
  const ctx = await requireAuth();
  const block = await ScheduleService.createBlock(eventId, ctx, data);
  revalidatePath(`/events/${eventId}/schedule`);
  return block;
}

export async function moveBlock(
  blockId: string,
  eventId: string,
  direction: "up" | "down"
) {
  const ctx = await requireAuth();
  await ScheduleService.moveBlock(blockId, ctx, direction);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function deleteBlock(blockId: string, eventId: string) {
  const ctx = await requireAuth();
  await ScheduleService.deleteBlock(blockId, ctx);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function createActivity(
  blockId: string,
  eventId: string,
  data: { title?: string }
) {
  const ctx = await requireAuth();
  const activity = await ScheduleService.createActivity(
    blockId,
    ctx,
    data
  );
  revalidatePath(`/events/${eventId}/schedule`);
  return activity;
}

export async function updateBlockField(
  blockId: string,
  eventId: string,
  data: { time_label?: string | null }
) {
  const ctx = await requireAuth();
  await ScheduleService.updateBlock(blockId, ctx, data);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function updateActivityField(
  activityId: string,
  eventId: string,
  data: { title?: string; description?: string | null; max_participants?: number | null; closed?: boolean }
) {
  const ctx = await requireAuth();
  await ScheduleService.updateActivity(activityId, ctx, data);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function deleteActivity(
  activityId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  await ScheduleService.deleteActivity(activityId, ctx);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function assignToActivity(
  activityId: string,
  eventPersonId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  await ScheduleService.assignToActivity(activityId, eventPersonId, ctx);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function unassignFromActivity(
  activityId: string,
  eventPersonId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  await ScheduleService.unassignFromActivity(activityId, eventPersonId, ctx);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function getBlockAssignments(
  blockId: string,
  eventId: string
): Promise<BlockAssignments> {
  const ctx = await requireAuth();
  return ScheduleService.getBlockAssignments(blockId, ctx);
}

export async function getSchedulePrintData(
  eventId: string
): Promise<PrintDaySchedule[]> {
  const ctx = await requireAuth();
  return ScheduleService.getSchedulePrintData(eventId, ctx);
}

export async function confirmSchedule(eventId: string) {
  const ctx = await requireAuth();
  await ScheduleService.confirmSchedule(eventId, ctx);
  revalidatePath(`/events/${eventId}/schedule`);
}
