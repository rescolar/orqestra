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
