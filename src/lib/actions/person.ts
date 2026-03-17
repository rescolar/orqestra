"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PersonService } from "@/lib/services/person.service";
import { EventService } from "@/lib/services/event.service";
import { PreAssignService } from "@/lib/services/preassign.service";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function seedTestParticipants(eventId: string) {
  const ctx = await requireAuth();
  await PersonService.seedTestParticipants(eventId, ctx);
  revalidatePath(`/events/${eventId}/board`);
}

export async function createParticipant(
  eventId: string,
  data: { name_full: string; gender: "unknown" | "female" | "male" | "other"; role: "participant" | "facilitator" }
) {
  const ctx = await requireAuth();
  await PersonService.createParticipant(eventId, ctx, data);
  revalidatePath(`/events/${eventId}/board`);
}

export async function createParticipantsBatch(
  eventId: string,
  names: string[]
) {
  const ctx = await requireAuth();
  await PersonService.createParticipantsBatch(eventId, ctx, names);
  revalidatePath(`/events/${eventId}/board`);
}

export async function getUnassignedPersons(eventId: string) {
  const ctx = await requireAuth();
  return PersonService.getUnassignedPersons(eventId, ctx);
}

export async function assignPerson(
  eventPersonId: string,
  roomId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  await PersonService.assignPerson(eventPersonId, roomId, ctx);
  revalidatePath(`/events/${eventId}/board`);
}

export async function unassignPerson(
  eventPersonId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  await PersonService.unassignPerson(eventPersonId, ctx);
  revalidatePath(`/events/${eventId}/board`);
}

export async function getEventPersonDetail(eventPersonId: string) {
  const ctx = await requireAuth();
  const ep = await PersonService.getEventPerson(eventPersonId, ctx);
  return {
    ...ep,
    amount_paid: ep.amount_paid ? Number(ep.amount_paid) : null,
  };
}

export async function updateEventPerson(
  eventPersonId: string,
  eventId: string,
  data: {
    role?: "participant" | "facilitator";
    status?: "inscrito" | "reservado" | "pagado" | "confirmado_sin_pago" | "solicita_cancelacion" | "cancelado";
    gender?: "unknown" | "female" | "male" | "other";
    contact_email?: string | null;
    contact_phone?: string | null;
    contact_address?: string | null;
    dietary_requirements?: string[];
    dietary_notified?: boolean;
    allergies_text?: string | null;
    requests_text?: string | null;
    requests_managed?: boolean;
    accommodation_mismatch_managed?: boolean;
    amount_paid?: number | null;
    payment_note?: string | null;
    date_arrival?: string | null;
    date_departure?: string | null;
    discount_breakfast?: number;
    discount_lunch?: number;
    discount_dinner?: number;
  }
) {
  const ctx = await requireAuth();
  const result = await PersonService.updateEventPerson(
    eventPersonId,
    ctx,
    data
  );
  revalidatePath(`/events/${eventId}/board`);
  return result;
}

export async function getBoardState(eventId: string) {
  const ctx = await requireAuth();

  const event = await EventService.getEventWithRooms(eventId, ctx);
  if (!event) throw new Error("Evento no encontrado");

  const unassigned = await PersonService.getUnassignedPersons(
    eventId,
    ctx
  );

  return { rooms: event.rooms, unassigned };
}

export async function getAllPersons(eventId: string) {
  const ctx = await requireAuth();
  return PersonService.getAllPersonsForUser(ctx, eventId);
}

export async function addPersonToEvent(
  personId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  const ep = await PersonService.addPersonToEvent(
    personId,
    ctx,
    eventId
  );
  revalidatePath(`/events/${eventId}/board`);
  return ep;
}

export async function addPersonToEventAndAssign(
  personId: string,
  roomId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  const result = await PersonService.addPersonToEventAndAssign(
    personId,
    roomId,
    ctx,
    eventId
  );
  revalidatePath(`/events/${eventId}/board`);
  return result;
}

export async function addAllPersonsToEvent(eventId: string) {
  const ctx = await requireAuth();
  const result = await PersonService.addAllPersonsToEvent(eventId, ctx);
  revalidatePath(`/events/${eventId}/board`);
  return result;
}

export async function removeEventPerson(
  eventPersonId: string,
  eventId: string
) {
  const ctx = await requireAuth();
  await PersonService.removeEventPerson(eventPersonId, ctx);
  revalidatePath(`/events/${eventId}/board`);
}

export async function preAssignParticipants(eventId: string) {
  const ctx = await requireAuth();
  const result = await PreAssignService.preAssign(eventId, ctx);
  revalidatePath(`/events/${eventId}/board`);
  return result;
}
