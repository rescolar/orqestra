"use server";

import { auth } from "@/lib/auth";
import { InviteService } from "@/lib/services/invite.service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function getMyEvents() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return InviteService.getParticipantEvents(session.user.id);
}

export async function joinEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await InviteService.joinEvent(session.user.id, eventId);
  revalidatePath("/my-events");
}

export async function getMyEventDetail(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return InviteService.getEventPersonForParticipant(session.user.id, eventId);
}

export async function updateEventPreferences(
  eventPersonId: string,
  data: {
    status?: "confirmed" | "tentative" | "cancelled";
    arrives_for_dinner?: boolean;
    last_meal_lunch?: boolean;
    requests_text?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await InviteService.updateEventPreferences(session.user.id, eventPersonId, data);
  revalidatePath("/my-events");
}

export async function getMyProfile() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return InviteService.getParticipantPerson(session.user.id);
}

export async function updateMyProfile(data: {
  name_full?: string;
  gender?: "unknown" | "female" | "male" | "other";
  contact_email?: string;
  contact_phone?: string;
  dietary_requirements?: string[];
  allergies_text?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await InviteService.updateParticipantProfile(session.user.id, data);
  revalidatePath("/my-profile");
}
