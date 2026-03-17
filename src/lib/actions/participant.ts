"use server";

import { auth } from "@/lib/auth";
import { InviteService } from "@/lib/services/invite.service";
import { ScheduleService } from "@/lib/services/schedule.service";
import { DiscoveryService } from "@/lib/services/discovery.service";
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
    status?: "solicita_cancelacion";
    arrives_for_dinner?: boolean;
    last_meal_lunch?: boolean;
    requests_text?: string;
    accommodation_room_type_id?: string | null;
    accommodation_occupancy?: number | null;
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
  discoverable?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await InviteService.updateParticipantProfile(session.user.id, data);
  revalidatePath("/my-profile");
}

export async function getEventSchedule(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return ScheduleService.getScheduleForParticipant(eventId, session.user.id);
}

export async function toggleActivitySignup(activityId: string, eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await ScheduleService.toggleSignup(activityId, session.user.id);
  revalidatePath(`/my-events/${eventId}`);
  return result;
}

export async function getAccommodationOptions(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { db } = await import("@/lib/db");
  const { resolveRoomTypePrice, computeNights } = await import("@/lib/pricing");

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      date_start: true,
      date_end: true,
      pricing_mode: true,
      facilitation_cost_day: true,
      management_cost_day: true,
      venue_id: true,
    },
  });

  if (!event?.venue_id) return [];

  const roomTypes = await db.roomType.findMany({
    where: { venue_id: event.venue_id },
    include: {
      occupancy_pricings: { orderBy: { occupancy: "asc" } },
      rooms: {
        where: { event_id: eventId },
        select: {
          id: true,
          capacity: true,
          _count: { select: { event_persons: true } },
        },
      },
    },
    orderBy: { position: "asc" },
  });

  const nights = computeNights(event.date_start, event.date_end);
  const days = nights; // convention: days = nights

  return roomTypes.map((rt) => {
    // Count available beds across all rooms of this type
    const availableBeds = rt.rooms.reduce(
      (sum, room) => sum + Math.max(0, room.capacity - room._count.event_persons),
      0
    );
    if (availableBeds === 0) return null;

    const options: { occupancy: number; label: string; totalPrice: number | null }[] = [];

    if (rt.occupancy_pricings.length > 0) {
      for (const op of rt.occupancy_pricings) {
        const pricePerNight = op.price ? Number(op.price) : null;
        let total: number | null = null;
        if (pricePerNight != null) {
          total = pricePerNight * nights;
          if (event.pricing_mode === "breakdown") {
            total += (Number(event.facilitation_cost_day) || 0) * days;
            total += (Number(event.management_cost_day) || 0) * days;
          }
        }
        options.push({
          occupancy: op.occupancy,
          label: op.occupancy === 1 ? "Individual" : op.occupancy === 2 ? "Compartida (2 pers)" : `${op.occupancy} personas`,
          totalPrice: total,
        });
      }
    } else if (rt.base_price != null) {
      const pricePerNight = Number(rt.base_price);
      let total = pricePerNight * nights;
      if (event.pricing_mode === "breakdown") {
        total += (Number(event.facilitation_cost_day) || 0) * days;
        total += (Number(event.management_cost_day) || 0) * days;
      }
      options.push({
        occupancy: rt.capacity,
        label: `${rt.capacity} plazas`,
        totalPrice: total,
      });
    }

    return {
      id: rt.id,
      name: rt.name,
      description: rt.description,
      capacity: rt.capacity,
      has_private_bathroom: rt.has_private_bathroom,
      availableBeds,
      options,
    };
  }).filter((rt): rt is NonNullable<typeof rt> => rt != null && rt.options.length > 0);
}

export async function getDiscoverableParticipants(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return DiscoveryService.getDiscoverableParticipants(eventId, session.user.id);
}
