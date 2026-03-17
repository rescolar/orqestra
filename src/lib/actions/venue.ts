"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { VenueService } from "@/lib/services/venue.service";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function getVenues() {
  const ctx = await requireAuth();
  return VenueService.getVenues(ctx);
}

export async function getVenue(venueId: string) {
  const ctx = await requireAuth();
  return VenueService.getVenue(venueId, ctx);
}

export async function createVenue(data: {
  name: string;
  location?: string | null;
  notes?: string | null;
}) {
  const ctx = await requireAuth();
  const venue = await VenueService.createVenue(ctx, data);
  revalidatePath("/venues");
  return venue;
}

export async function updateVenue(
  venueId: string,
  data: {
    name?: string;
    location?: string | null;
    notes?: string | null;
  }
) {
  const ctx = await requireAuth();
  await VenueService.updateVenue(venueId, ctx, data);
  revalidatePath("/venues");
  revalidatePath(`/venues/${venueId}`);
}

export async function deleteVenue(venueId: string) {
  const ctx = await requireAuth();
  await VenueService.deleteVenue(venueId, ctx);
  revalidatePath("/venues");
}

export async function saveEventAsVenue(eventId: string, name: string) {
  const ctx = await requireAuth();
  const venue = await VenueService.saveEventAsVenue(eventId, name, ctx);
  revalidatePath("/venues");
  return venue;
}

export async function createEventRoomsFromVenue(
  eventId: string,
  venueId: string,
  quantities: { roomTypeId: string; quantity: number }[]
) {
  const ctx = await requireAuth();
  await VenueService.createEventRoomsFromVenue(eventId, venueId, ctx, quantities);
  revalidatePath(`/events/${eventId}/board`);
}

// ─── RoomType CRUD ──────────────────────────────────────────────────────────

export async function createRoomType(
  venueId: string,
  data: {
    name: string;
    description?: string | null;
    capacity: number;
    has_private_bathroom?: boolean;
    base_price?: number | null;
    occupancy_pricings?: { occupancy: number; price: number }[];
  }
) {
  const ctx = await requireAuth();
  const rt = await VenueService.createRoomType(venueId, ctx, data);
  revalidatePath(`/venues/${venueId}`);
  return rt;
}

export async function updateRoomType(
  roomTypeId: string,
  data: {
    name?: string;
    description?: string | null;
    capacity?: number;
    has_private_bathroom?: boolean;
    base_price?: number | null;
    occupancy_pricings?: { occupancy: number; price: number }[];
  }
) {
  const ctx = await requireAuth();
  const rt = await VenueService.updateRoomType(roomTypeId, ctx, data);
  revalidatePath("/venues");
  return rt;
}

export async function deleteRoomType(roomTypeId: string) {
  const ctx = await requireAuth();
  await VenueService.deleteRoomType(roomTypeId, ctx);
  revalidatePath("/venues");
}

export async function createImplicitVenue(eventId: string) {
  const ctx = await requireAuth();
  const venue = await VenueService.createImplicitVenue(eventId, ctx);
  return venue;
}

export async function promoteVenueToTemplate(venueId: string, name: string) {
  const ctx = await requireAuth();
  await VenueService.promoteVenueToTemplate(venueId, name, ctx);
  revalidatePath("/venues");
}
