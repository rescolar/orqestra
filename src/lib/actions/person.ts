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

export async function getUnassignedPersons(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return PersonService.getUnassignedPersons(eventId, session.user.id);
}
