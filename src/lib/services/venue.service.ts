import { db } from "@/lib/db";
import type { AuthContext } from "./auth-context";
import { ownershipFilter, canAccessEvent } from "./auth-context";

export const VenueService = {
  async getVenues(ctx: AuthContext) {
    return db.venue.findMany({
      where: ownershipFilter(ctx),
      include: {
        _count: { select: { venue_rooms: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  async getVenue(venueId: string, ctx: AuthContext) {
    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
      include: {
        venue_rooms: {
          orderBy: { internal_number: "asc" },
        },
      },
    });
    if (!venue) throw new Error("Centro no encontrado");
    return venue;
  },

  async createVenue(
    ctx: AuthContext,
    data: { name: string; location?: string | null; notes?: string | null }
  ) {
    return db.venue.create({
      data: {
        user_id: ctx.userId,
        name: data.name,
        location: data.location ?? null,
        notes: data.notes ?? null,
      },
    });
  },

  async updateVenue(
    venueId: string,
    ctx: AuthContext,
    data: {
      name?: string;
      location?: string | null;
      notes?: string | null;
      pricing_by_room_type?: boolean;
    }
  ) {
    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
    });
    if (!venue) throw new Error("Centro no encontrado");

    return db.venue.update({
      where: { id: venueId },
      data,
    });
  },

  async deleteVenue(venueId: string, ctx: AuthContext) {
    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
    });
    if (!venue) throw new Error("Centro no encontrado");

    await db.venue.delete({ where: { id: venueId } });
  },

  async saveVenueRoomsFromTypes(
    venueId: string,
    ctx: AuthContext,
    types: {
      capacity: number;
      hasPrivateBathroom: boolean;
      quantity: number;
      price?: number;
      dailyRate?: number;
    }[],
    pricingByRoomType?: boolean
  ) {
    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
    });
    if (!venue) throw new Error("Centro no encontrado");

    // Delete existing venue rooms and recreate
    await db.venueRoom.deleteMany({ where: { venue_id: venueId } });

    const rooms: {
      venue_id: string;
      internal_number: string;
      display_name: string;
      capacity: number;
      has_private_bathroom: boolean;
      price?: number;
      daily_rate?: number;
    }[] = [];

    let counter = 1;
    for (const type of types) {
      for (let i = 0; i < type.quantity; i++) {
        const num = String(counter).padStart(2, "0");
        rooms.push({
          venue_id: venueId,
          internal_number: num,
          display_name: `Hab ${num}`,
          capacity: type.capacity,
          has_private_bathroom: type.hasPrivateBathroom,
          ...(pricingByRoomType && type.price != null && { price: type.price }),
          ...(pricingByRoomType && type.dailyRate != null && { daily_rate: type.dailyRate }),
        });
        counter++;
      }
    }

    await db.venueRoom.createMany({ data: rooms });

    // Update pricing_by_room_type flag on venue
    await db.venue.update({
      where: { id: venueId },
      data: { pricing_by_room_type: !!pricingByRoomType },
    });
  },

  async saveEventAsVenue(
    eventId: string,
    name: string,
    ctx: AuthContext
  ) {
    if (!(await canAccessEvent(ctx, eventId))) {
      throw new Error("Evento no encontrado");
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        pricing_by_room_type: true,
        rooms: {
          select: {
            internal_number: true,
            display_name: true,
            icon: true,
            capacity: true,
            has_private_bathroom: true,
            gender_restriction: true,
            description: true,
            tags: true,
          },
        },
        room_pricings: {
          select: {
            capacity: true,
            has_private_bathroom: true,
            price: true,
            daily_rate: true,
          },
        },
      },
    });

    if (!event) throw new Error("Evento no encontrado");

    // Build a pricing lookup
    const pricingMap = new Map<string, { price: number; daily_rate?: number | null }>();
    for (const p of event.room_pricings) {
      const key = `${p.capacity}-${p.has_private_bathroom}`;
      pricingMap.set(key, { price: Number(p.price), daily_rate: p.daily_rate ? Number(p.daily_rate) : null });
    }

    const venue = await db.venue.create({
      data: {
        user_id: ctx.userId,
        name,
        pricing_by_room_type: event.pricing_by_room_type,
        venue_rooms: {
          create: event.rooms.map((r) => {
            const pricing = pricingMap.get(`${r.capacity}-${r.has_private_bathroom}`);
            return {
              internal_number: r.internal_number,
              display_name: r.display_name,
              icon: r.icon,
              capacity: r.capacity,
              has_private_bathroom: r.has_private_bathroom,
              gender_restriction: r.gender_restriction,
              description: r.description,
              tags: r.tags,
              ...(pricing && { price: pricing.price }),
              ...(pricing?.daily_rate != null && { daily_rate: pricing.daily_rate }),
            };
          }),
        },
      },
    });

    return venue;
  },

  async createEventRoomsFromVenue(
    eventId: string,
    venueId: string,
    ctx: AuthContext
  ) {
    if (!(await canAccessEvent(ctx, eventId))) {
      throw new Error("Evento no encontrado");
    }

    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
      include: { venue_rooms: true },
    });

    if (!venue) throw new Error("Centro no encontrado");

    // Copy venue rooms as event rooms
    const rooms = venue.venue_rooms.map((vr) => ({
      event_id: eventId,
      internal_number: vr.internal_number,
      display_name: vr.display_name,
      icon: vr.icon,
      capacity: vr.capacity,
      has_private_bathroom: vr.has_private_bathroom,
      gender_restriction: vr.gender_restriction,
      description: vr.description,
      tags: vr.tags,
    }));

    await db.room.createMany({ data: rooms });

    // Copy pricings from venue rooms (deduplicated by capacity+bathroom)
    const seen = new Set<string>();
    const pricings: {
      event_id: string;
      capacity: number;
      has_private_bathroom: boolean;
      price: number;
      daily_rate?: number;
    }[] = [];

    for (const vr of venue.venue_rooms) {
      if (vr.price == null) continue;
      const key = `${vr.capacity}-${vr.has_private_bathroom}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pricings.push({
        event_id: eventId,
        capacity: vr.capacity,
        has_private_bathroom: vr.has_private_bathroom,
        price: Number(vr.price),
        ...(vr.daily_rate != null && { daily_rate: Number(vr.daily_rate) }),
      });
    }

    if (pricings.length > 0) {
      await db.roomPricing.createMany({ data: pricings });
    }

    // Update event with venue reference and pricing flag
    await db.event.update({
      where: { id: eventId },
      data: {
        venue_id: venueId,
        ...(venue.pricing_by_room_type && { pricing_by_room_type: true }),
      },
    });
  },
};
