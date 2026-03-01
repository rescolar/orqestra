"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PersonService } from "@/lib/services/person.service";

export async function seedTestParticipants(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.seedTestParticipants(eventId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
}

export async function createParticipant(
  eventId: string,
  data: { name_full: string; gender: "unknown" | "female" | "male" | "other"; role: "participant" | "facilitator" }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.createParticipant(eventId, session.user.id, data);
  revalidatePath(`/events/${eventId}/board`);
}

export async function createParticipantsBatch(
  eventId: string,
  names: string[]
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.createParticipantsBatch(eventId, session.user.id, names);
  revalidatePath(`/events/${eventId}/board`);
}

export async function getUnassignedPersons(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return PersonService.getUnassignedPersons(eventId, session.user.id);
}

export async function assignPerson(
  eventPersonId: string,
  roomId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.assignPerson(eventPersonId, roomId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
}

export async function unassignPerson(
  eventPersonId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.unassignPerson(eventPersonId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
}

export async function getEventPersonDetail(eventPersonId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return PersonService.getEventPerson(eventPersonId, session.user.id);
}

export async function updateEventPerson(
  eventPersonId: string,
  eventId: string,
  data: {
    role?: "participant" | "facilitator";
    status?: "confirmed" | "tentative" | "cancelled";
    gender?: "unknown" | "female" | "male" | "other";
    dietary_requirements?: string[];
    dietary_notified?: boolean;
    allergies_text?: string | null;
    requests_text?: string | null;
    requests_managed?: boolean;
    move_with_partner?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await PersonService.updateEventPerson(
    eventPersonId,
    session.user.id,
    data
  );
  revalidatePath(`/events/${eventId}/board`);
  return result;
}

export async function removeEventPerson(
  eventPersonId: string,
  eventId: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.removeEventPerson(eventPersonId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
}
