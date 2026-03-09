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
  const eventPriceRaw = formData.get("event_price") as string | null;
  const depositAmountRaw = formData.get("deposit_amount") as string | null;

  if (!name || !dateStart || !dateEnd || !estimatedParticipants) {
    throw new Error("Todos los campos son obligatorios");
  }

  if (estimatedParticipants < 1) {
    throw new Error("El número de participantes debe ser al menos 1");
  }

  const eventPrice = eventPriceRaw ? parseFloat(eventPriceRaw) : null;
  const depositAmount = depositAmountRaw ? parseFloat(depositAmountRaw) : null;

  const event = await EventService.createEvent(ctx.id, {
    name,
    date_start: new Date(dateStart),
    date_end: new Date(dateEnd),
    estimated_participants: estimatedParticipants,
    event_price: eventPrice && !isNaN(eventPrice) ? eventPrice : null,
    deposit_amount: depositAmount && !isNaN(depositAmount) ? depositAmount : null,
  });

  redirect(`/events/${event.id}/setup`);
}

export async function createRoomsFromTypes(
  eventId: string,
  types: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number }[],
  pricingByRoomType?: boolean
) {
  const ctx = await requireAuth();
  await EventService.createRoomsFromTypes(eventId, ctx, types, pricingByRoomType);
  redirect(`/events/${eventId}/detail`);
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
  pricings: { capacity: number; has_private_bathroom: boolean; price: number }[]
) {
  const ctx = await requireAuth();
  await EventService.updateRoomPricings(eventId, ctx, pricings);
  revalidatePath(`/events/${eventId}/detail`);
}
