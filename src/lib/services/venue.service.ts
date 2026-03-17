import { db } from "@/lib/db";
import type { AuthContext } from "./auth-context";
import { ownershipFilter, canAccessEvent } from "./auth-context";

export const VenueService = {
  async getVenues(ctx: AuthContext) {
    return db.venue.findMany({
      where: { ...ownershipFilter(ctx), is_template: true },
      include: {
        _count: { select: { room_types: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  async getVenue(venueId: string, ctx: AuthContext) {
    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
      include: {
        room_types: {
          orderBy: { position: "asc" },
          include: {
            occupancy_pricings: {
              orderBy: { occupancy: "asc" },
            },
          },
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
        is_template: true,
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

  // ─── RoomType CRUD ──────────────────────────────────────────────────────────

  async createRoomType(
    venueId: string,
    ctx: AuthContext,
    data: {
      name: string;
      description?: string | null;
      capacity: number;
      has_private_bathroom?: boolean;
      base_price?: number | null;
      occupancy_pricings?: { occupancy: number; price: number }[];
    }
  ) {
    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
    });
    if (!venue) throw new Error("Centro no encontrado");

    // Get max position
    const maxPos = await db.roomType.aggregate({
      where: { venue_id: venueId },
      _max: { position: true },
    });

    return db.roomType.create({
      data: {
        venue_id: venueId,
        name: data.name,
        description: data.description ?? null,
        capacity: data.capacity,
        has_private_bathroom: data.has_private_bathroom ?? false,
        base_price: data.base_price ?? null,
        position: (maxPos._max.position ?? -1) + 1,
        ...(data.occupancy_pricings && data.occupancy_pricings.length > 0 && {
          occupancy_pricings: {
            create: data.occupancy_pricings.map((op) => ({
              occupancy: op.occupancy,
              price: op.price,
            })),
          },
        }),
      },
      include: { occupancy_pricings: true },
    });
  },

  async updateRoomType(
    roomTypeId: string,
    ctx: AuthContext,
    data: {
      name?: string;
      description?: string | null;
      capacity?: number;
      has_private_bathroom?: boolean;
      base_price?: number | null;
      occupancy_pricings?: { occupancy: number; price: number }[];
    }
  ) {
    const rt = await db.roomType.findFirst({
      where: { id: roomTypeId },
      include: { venue: { select: { user_id: true } } },
    });
    if (!rt || rt.venue.user_id !== ctx.userId) throw new Error("Tipo no encontrado");

    // Update occupancy pricings if provided
    if (data.occupancy_pricings !== undefined) {
      await db.occupancyPricing.deleteMany({ where: { room_type_id: roomTypeId } });
      if (data.occupancy_pricings.length > 0) {
        await db.occupancyPricing.createMany({
          data: data.occupancy_pricings.map((op) => ({
            room_type_id: roomTypeId,
            occupancy: op.occupancy,
            price: op.price,
          })),
        });
      }
    }

    const { occupancy_pricings: _, ...updateData } = data;
    return db.roomType.update({
      where: { id: roomTypeId },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.capacity !== undefined && { capacity: updateData.capacity }),
        ...(updateData.has_private_bathroom !== undefined && { has_private_bathroom: updateData.has_private_bathroom }),
        ...(updateData.base_price !== undefined && { base_price: updateData.base_price }),
      },
      include: { occupancy_pricings: { orderBy: { occupancy: "asc" } } },
    });
  },

  async deleteRoomType(roomTypeId: string, ctx: AuthContext) {
    const rt = await db.roomType.findFirst({
      where: { id: roomTypeId },
      include: { venue: { select: { user_id: true } } },
    });
    if (!rt || rt.venue.user_id !== ctx.userId) throw new Error("Tipo no encontrado");

    await db.roomType.delete({ where: { id: roomTypeId } });
  },

  // ─── Event ↔ Venue operations ──────────────────────────────────────────────

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
        venue_id: true,
        rooms: {
          select: {
            capacity: true,
            has_private_bathroom: true,
            room_type_id: true,
          },
        },
        room_pricings: {
          select: {
            capacity: true,
            has_private_bathroom: true,
            price: true,
          },
        },
      },
    });

    if (!event) throw new Error("Evento no encontrado");

    // Build a pricing lookup from RoomPricing (legacy)
    const pricingMap = new Map<string, number>();
    for (const p of event.room_pricings) {
      const key = `${p.capacity}-${p.has_private_bathroom}`;
      pricingMap.set(key, Number(p.price));
    }

    // Group rooms by type to create RoomTypes
    const typeMap = new Map<string, { capacity: number; has_private_bathroom: boolean; count: number; price?: number }>();
    for (const r of event.rooms) {
      const key = `${r.capacity}-${r.has_private_bathroom}`;
      const existing = typeMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        typeMap.set(key, {
          capacity: r.capacity,
          has_private_bathroom: r.has_private_bathroom,
          count: 1,
          price: pricingMap.get(key),
        });
      }
    }

    const venue = await db.venue.create({
      data: {
        user_id: ctx.userId,
        name,
        is_template: true,
        room_types: {
          create: Array.from(typeMap.values()).map((t, i) => ({
            name: `${t.capacity} plazas${t.has_private_bathroom ? " (baño)" : ""}`,
            capacity: t.capacity,
            has_private_bathroom: t.has_private_bathroom,
            base_price: t.price ?? null,
            position: i,
          })),
        },
      },
    });

    return venue;
  },

  async createEventRoomsFromVenue(
    eventId: string,
    venueId: string,
    ctx: AuthContext,
    quantities: { roomTypeId: string; quantity: number }[]
  ) {
    if (!(await canAccessEvent(ctx, eventId))) {
      throw new Error("Evento no encontrado");
    }

    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
      include: {
        room_types: {
          include: { occupancy_pricings: true },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!venue) throw new Error("Centro no encontrado");

    const rooms: {
      event_id: string;
      internal_number: string;
      display_name: string;
      capacity: number;
      has_private_bathroom: boolean;
      room_type_id: string;
    }[] = [];

    let counter = 1;
    for (const { roomTypeId, quantity } of quantities) {
      const rt = venue.room_types.find((t) => t.id === roomTypeId);
      if (!rt) continue;

      for (let i = 0; i < quantity; i++) {
        const num = String(counter).padStart(2, "0");
        rooms.push({
          event_id: eventId,
          internal_number: num,
          display_name: `${rt.name} ${num}`,
          capacity: rt.capacity,
          has_private_bathroom: rt.has_private_bathroom,
          room_type_id: rt.id,
        });
        counter++;
      }
    }

    await db.room.createMany({ data: rooms });

    // Also create RoomPricing entries for backward compat
    const seen = new Set<string>();
    const pricings: {
      event_id: string;
      capacity: number;
      has_private_bathroom: boolean;
      price: number;
    }[] = [];

    for (const rt of venue.room_types) {
      if (rt.base_price == null) continue;
      const key = `${rt.capacity}-${rt.has_private_bathroom}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pricings.push({
        event_id: eventId,
        capacity: rt.capacity,
        has_private_bathroom: rt.has_private_bathroom,
        price: Number(rt.base_price),
      });
    }

    if (pricings.length > 0) {
      await db.roomPricing.createMany({ data: pricings });
    }

    // Update event with venue reference
    await db.event.update({
      where: { id: eventId },
      data: {
        venue_id: venueId,
        pricing_by_room_type: pricings.length > 0,
      },
    });
  },

  /** Create an implicit (non-template) venue for an event */
  async createImplicitVenue(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) {
      throw new Error("Evento no encontrado");
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { name: true },
    });

    const venue = await db.venue.create({
      data: {
        user_id: ctx.userId,
        name: event?.name ?? "Sin nombre",
        is_template: false,
      },
    });

    await db.event.update({
      where: { id: eventId },
      data: { venue_id: venue.id },
    });

    return venue;
  },

  /** Create an implicit venue with room types, occupancy pricings, and rooms in one transaction */
  async createVenueWithRoomTypesAndRooms(
    eventId: string,
    ctx: AuthContext,
    roomTypeDefs: {
      name: string;
      description?: string | null;
      capacity: number;
      has_private_bathroom: boolean;
      base_price?: number | null;
      occupancy_pricings?: { occupancy: number; price: number }[];
    }[],
    quantities: number[]
  ) {
    if (!(await canAccessEvent(ctx, eventId))) {
      throw new Error("Evento no encontrado");
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { name: true, venue_id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    // If event already has a venue with room types, delete the old one (implicit only)
    if (event.venue_id) {
      const oldVenue = await db.venue.findFirst({
        where: { id: event.venue_id, is_template: false },
      });
      if (oldVenue) {
        await db.room.deleteMany({ where: { event_id: eventId } });
        await db.roomPricing.deleteMany({ where: { event_id: eventId } });
        await db.venue.delete({ where: { id: oldVenue.id } });
      }
    }

    return db.$transaction(async (tx) => {
      // 1. Create implicit venue
      const venue = await tx.venue.create({
        data: {
          user_id: ctx.userId,
          name: event.name ?? "Sin nombre",
          is_template: false,
        },
      });

      // 2. Create room types + occupancy pricings
      const createdTypes: { id: string; name: string; capacity: number; has_private_bathroom: boolean; base_price: number | null }[] = [];
      for (let i = 0; i < roomTypeDefs.length; i++) {
        const def = roomTypeDefs[i];
        const rt = await tx.roomType.create({
          data: {
            venue_id: venue.id,
            name: def.name,
            description: def.description ?? null,
            capacity: def.capacity,
            has_private_bathroom: def.has_private_bathroom,
            base_price: def.base_price ?? null,
            position: i,
            ...(def.occupancy_pricings && def.occupancy_pricings.length > 0 && {
              occupancy_pricings: {
                create: def.occupancy_pricings.map((op) => ({
                  occupancy: op.occupancy,
                  price: op.price,
                })),
              },
            }),
          },
        });
        createdTypes.push({
          id: rt.id,
          name: rt.name,
          capacity: rt.capacity,
          has_private_bathroom: rt.has_private_bathroom,
          base_price: def.base_price ?? null,
        });
      }

      // 3. Create rooms
      const rooms: {
        event_id: string;
        internal_number: string;
        display_name: string;
        capacity: number;
        has_private_bathroom: boolean;
        room_type_id: string;
      }[] = [];

      let counter = 1;
      for (let i = 0; i < createdTypes.length; i++) {
        const rt = createdTypes[i];
        const qty = quantities[i] ?? 0;
        for (let j = 0; j < qty; j++) {
          const num = String(j + 1).padStart(2, "0");
          rooms.push({
            event_id: eventId,
            internal_number: String(counter).padStart(2, "0"),
            display_name: `${rt.name} ${num}`,
            capacity: rt.capacity,
            has_private_bathroom: rt.has_private_bathroom,
            room_type_id: rt.id,
          });
          counter++;
        }
      }

      if (rooms.length > 0) {
        await tx.room.createMany({ data: rooms });
      }

      // 4. Create RoomPricing for backward compat
      const seen = new Set<string>();
      const pricings: {
        event_id: string;
        capacity: number;
        has_private_bathroom: boolean;
        price: number;
      }[] = [];

      for (const rt of createdTypes) {
        if (rt.base_price == null) continue;
        const key = `${rt.capacity}-${rt.has_private_bathroom}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pricings.push({
          event_id: eventId,
          capacity: rt.capacity,
          has_private_bathroom: rt.has_private_bathroom,
          price: rt.base_price,
        });
      }

      if (pricings.length > 0) {
        await tx.roomPricing.createMany({ data: pricings });
      }

      // 5. Update event
      const hasPricing = createdTypes.some((rt) => rt.base_price != null);
      await tx.event.update({
        where: { id: eventId },
        data: {
          venue_id: venue.id,
          pricing_by_room_type: hasPricing,
        },
      });

      return venue;
    });
  },

  /** Promote an implicit venue to a template (user names it) */
  async promoteVenueToTemplate(venueId: string, name: string, ctx: AuthContext) {
    const venue = await db.venue.findFirst({
      where: { id: venueId, ...ownershipFilter(ctx) },
    });
    if (!venue) throw new Error("Centro no encontrado");

    return db.venue.update({
      where: { id: venueId },
      data: { name, is_template: true },
    });
  },
};
