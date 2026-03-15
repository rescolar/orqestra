"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EventService } from "@/lib/services/event.service";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext & { id: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role, id: session.user.id };
}

export async function getEvents() {
  const ctx = await requireAuth();
  return EventService.getEventsByUser(ctx);
}

export async function deleteEvent(eventId: string) {
  const ctx = await requireAuth();
  await EventService.deleteEvent(eventId, ctx);
  revalidatePath("/dashboard");
}

export async function createEvent(formData: FormData) {
  const ctx = await requireAuth();

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

  const event = await EventService.createEvent(ctx.id, {
    name,
    date_start: new Date(dateStart),
    date_end: new Date(dateEnd),
    estimated_participants: estimatedParticipants,
  });

  redirect(`/events/${event.id}/setup`);
}

export async function createRoomsFromTypes(
  eventId: string,
  types: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[],
  pricingByRoomType?: boolean
) {
  const ctx = await requireAuth();
  await EventService.createRoomsFromTypes(eventId, ctx, types, pricingByRoomType);
  redirect(`/events/${eventId}/detail?from=wizard`);
}

export async function createRoomsFromTypesOnly(
  eventId: string,
  types: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[],
  pricingByRoomType?: boolean
) {
  const ctx = await requireAuth();
  await EventService.createRoomsFromTypes(eventId, ctx, types, pricingByRoomType);
}

export async function saveEventSetupFields(
  eventId: string,
  data: {
    location?: string | null;
    event_price?: number | null;
    deposit_amount?: number | null;
    pricing_by_room_type?: boolean;
    pricing_mode?: string;
    facilitation_cost_day?: number | null;
    facilitation_cost_half_day?: number | null;
    management_cost_day?: number | null;
    meal_cost_breakfast?: number | null;
    meal_cost_lunch?: number | null;
    meal_cost_dinner?: number | null;
  }
) {
  const ctx = await requireAuth();
  // Fetch current event to preserve existing fields
  const current = await EventService.getEventForDetail(eventId, ctx);
  if (!current) throw new Error("Evento no encontrado");
  await EventService.updateEventDetails(eventId, ctx, {
    name: current.name,
    description: current.description,
    location: data.location ?? null,
    image_url: current.image_url,
    event_price: data.event_price,
    deposit_amount: data.deposit_amount,
    pricing_by_room_type: data.pricing_by_room_type,
    pricing_mode: data.pricing_mode,
    facilitation_cost_day: data.facilitation_cost_day,
    facilitation_cost_half_day: data.facilitation_cost_half_day,
    management_cost_day: data.management_cost_day,
    meal_cost_breakfast: data.meal_cost_breakfast,
    meal_cost_lunch: data.meal_cost_lunch,
    meal_cost_dinner: data.meal_cost_dinner,
  });
  revalidatePath(`/events/${eventId}/setup`);
}

export async function createEventWithVenue(formData: FormData, venueId: string) {
  const ctx = await requireAuth();

  const name = formData.get("name") as string;
  const dateStart = formData.get("date_start") as string;
  const dateEnd = formData.get("date_end") as string;
  const estimatedParticipants = Number(formData.get("estimated_participants"));

  if (!name || !dateStart || !dateEnd || !estimatedParticipants) {
    throw new Error("Todos los campos son obligatorios");
  }

  const event = await EventService.createEvent(ctx.id, {
    name,
    date_start: new Date(dateStart),
    date_end: new Date(dateEnd),
    estimated_participants: estimatedParticipants,
  });

  // Copy rooms from venue — get all room types and create 1 room per type
  const { VenueService } = await import("@/lib/services/venue.service");
  const venue = await VenueService.getVenue(venueId, ctx);
  const quantities = venue.room_types.map((rt) => ({ roomTypeId: rt.id, quantity: 1 }));
  await VenueService.createEventRoomsFromVenue(event.id, venueId, ctx, quantities);

  redirect(`/events/${event.id}/setup`);
}

export async function createEventWithRoomTypes(
  eventId: string,
  roomTypes: {
    name: string;
    description?: string | null;
    capacity: number;
    has_private_bathroom: boolean;
    base_price?: number | null;
    occupancy_pricings?: { occupancy: number; price: number }[];
  }[],
  quantities: number[]
) {
  const ctx = await requireAuth();
  const { VenueService } = await import("@/lib/services/venue.service");
  await VenueService.createVenueWithRoomTypesAndRooms(eventId, ctx, roomTypes, quantities);
  revalidatePath(`/events/${eventId}/setup`);
  revalidatePath(`/events/${eventId}/board`);
}

export async function getRoomTypes(eventId: string) {
  const ctx = await requireAuth();
  return EventService.getRoomTypes(eventId, ctx);
}

export async function addRoomsToEvent(
  eventId: string,
  types: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[],
  pricingByRoomType?: boolean
) {
  const ctx = await requireAuth();
  await EventService.addRoomsToEvent(eventId, ctx, types, pricingByRoomType);
  revalidatePath(`/events/${eventId}/detail`);
  revalidatePath(`/events/${eventId}/board`);
}

export async function addRoomsByType(eventId: string, roomTypeId: string, quantity: number) {
  const ctx = await requireAuth();
  await EventService.addRoomsByType(eventId, roomTypeId, quantity, ctx);
  revalidatePath(`/events/${eventId}/detail`);
  revalidatePath(`/events/${eventId}/board`);
}

export async function updateParticipantDiscovery(eventId: string, enabled: boolean) {
  const ctx = await requireAuth();
  await EventService.updateParticipantDiscovery(eventId, ctx, enabled);
  revalidatePath(`/events/${eventId}/detail`);
}

export async function updateEventDetails(
  eventId: string,
  data: {
    name: string;
    description: string | null;
    location: string | null;
    image_url: string | null;
    date_start?: string;
    date_end?: string;
    event_price?: number | null;
    deposit_amount?: number | null;
    pricing_by_room_type?: boolean;
    pricing_mode?: string;
    facilitation_cost_day?: number | null;
    facilitation_cost_half_day?: number | null;
    management_cost_day?: number | null;
    meal_cost_breakfast?: number | null;
    meal_cost_lunch?: number | null;
    meal_cost_dinner?: number | null;
  }
) {
  const ctx = await requireAuth();
  await EventService.updateEventDetails(eventId, ctx, data);
  revalidatePath("/dashboard");
}

export async function getRoomPricings(eventId: string) {
  const ctx = await requireAuth();
  return EventService.getRoomPricings(eventId, ctx);
}

export async function updateRoomPricings(
  eventId: string,
  pricings: { capacity: number; has_private_bathroom: boolean; price: number; daily_rate?: number | null }[]
) {
  const ctx = await requireAuth();
  await EventService.updateRoomPricings(eventId, ctx, pricings);
  revalidatePath(`/events/${eventId}/detail`);
}
