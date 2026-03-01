"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EventService } from "@/lib/services/event.service";

export async function getEvents() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return EventService.getEventsByUser(session.user.id);
}

export async function deleteEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await EventService.deleteEvent(eventId, session.user.id);
  revalidatePath("/dashboard");
}

export async function createEvent(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const name = formData.get("name") as string;
  const dateStart = formData.get("date_start") as string;
  const dateEnd = formData.get("date_end") as string;
  const estimatedParticipants = Number(formData.get("estimated_participants"));

  if (!name || !dateStart || !dateEnd || !estimatedParticipants) {
    throw new Error("Todos los campos son obligatorios");
  }

  if (estimatedParticipants < 1) {
    throw new Error("El número de participantes debe ser al menos 1");
  }

  const event = await EventService.createEvent(session.user.id, {
    name,
    date_start: new Date(dateStart),
    date_end: new Date(dateEnd),
    estimated_participants: estimatedParticipants,
  });

  redirect(`/events/${event.id}/board`);
}
