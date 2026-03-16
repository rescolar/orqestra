import { db } from "@/lib/db";
import type { AuthContext } from "./auth-context";
import { ownershipFilter, canAccessEvent, isEventOwner } from "./auth-context";

export const EventService = {
  async getEventsByUser(ctx: AuthContext) {
    const whereClause = ctx.role === "admin"
      ? {}
      : {
          OR: [
            { user_id: ctx.userId },
            { collaborators: { some: { user_id: ctx.userId } } },
          ],
        };

    const events = await db.event.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { event_persons: true, rooms: true },
        },
        event_persons: {
          select: {
            id: true,
            room_id: true,
            status: true,
            dietary_notified: true,
            requests_text: true,
            requests_managed: true,
            person: {
              select: {
                gender: true,
                dietary_requirements: true,
                allergies_text: true,
              },
            },
          },
        },
        rooms: {
          select: {
            capacity: true,
            gender_restriction: true,
            event_persons: {
              select: { person: { select: { gender: true } } },
            },
          },
        },
      },
      orderBy: { date_start: "desc" },
    });

    return events.map((event: typeof events[number]) => {
      const assignedCount = event.event_persons.filter((ep) => ep.room_id !== null).length;
      const totalCapacity = event.rooms.reduce((sum, r) => sum + r.capacity, 0);
      const isCollaborator = event.user_id !== ctx.userId && ctx.role !== "admin";

      // Pending count: dietary + conflicts + cancel requests + requests
      const dietaryCount = event.event_persons.filter(
        (ep) =>
          !ep.dietary_notified &&
          (ep.person.dietary_requirements.length > 0 || ep.person.allergies_text !== null)
      ).length;

      const conflictCount = event.rooms.filter((r) => {
        const count = r.event_persons.length;
        if (count > r.capacity) return true;
        if (r.gender_restriction !== "mixed") {
          const expected = r.gender_restriction === "women" ? "female" : "male";
          if (r.event_persons.some((ep) => ep.person.gender !== expected && ep.person.gender !== "unknown")) return true;
        }
        return false;
      }).length;

      const cancelRequestCount = event.event_persons.filter((ep) => ep.status === "solicita_cancelacion").length;
      const requestCount = event.event_persons.filter(
        (ep) => !ep.requests_managed && ep.requests_text !== null
      ).length;

      return {
        id: event.id,
        name: event.name,
        date_start: event.date_start,
        date_end: event.date_end,
        estimated_participants: event.estimated_participants,
        status: event.status,
        image_url: event.image_url,
        location: event.location,
        assigned_count: assignedCount,
        room_count: event._count.rooms,
        total_capacity: totalCapacity,
        pending_count: dietaryCount + conflictCount + cancelRequestCount + requestCount,
        is_collaborator: isCollaborator,
      };
    });
  },

  async createEvent(
    userId: string,
    data: {
      name: string;
      date_start: Date;
      date_end: Date;
      estimated_participants: number;
      event_price?: number | null;
      deposit_amount?: number | null;
    }
  ) {
    return db.event.create({
      data: {
        user_id: userId,
        name: data.name,
        date_start: data.date_start,
        date_end: data.date_end,
        estimated_participants: data.estimated_participants,
        status: "active",
        ...(data.event_price != null && { event_price: data.event_price }),
        ...(data.deposit_amount != null && { deposit_amount: data.deposit_amount }),
      },
    });
  },

  async createRoomsFromTypes(
    eventId: string,
    ctx: AuthContext,
    types: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[],
    pricingByRoomType?: boolean
  ) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    const rooms: {
      event_id: string;
      internal_number: string;
      display_name: string;
      capacity: number;
      has_private_bathroom: boolean;
    }[] = [];

    let counter = 1;
    for (const type of types) {
      for (let i = 0; i < type.quantity; i++) {
        const num = String(counter).padStart(2, "0");
        rooms.push({
          event_id: eventId,
          internal_number: num,
          display_name: `Hab ${num}`,
          capacity: type.capacity,
          has_private_bathroom: type.hasPrivateBathroom,
        });
        counter++;
      }
    }

    await db.room.createMany({ data: rooms });

    // Create room pricings if pricing by room type is enabled
    if (pricingByRoomType) {
      const pricings = types
        .filter((t) => t.price != null)
        .map((t) => ({
          event_id: eventId,
          capacity: t.capacity,
          has_private_bathroom: t.hasPrivateBathroom,
          price: t.price!,
          ...(t.dailyRate != null && { daily_rate: t.dailyRate }),
        }));

      // Deduplicate by capacity+bathroom (in case user added same combo twice)
      const seen = new Set<string>();
      const uniquePricings = pricings.filter((p) => {
        const key = `${p.capacity}-${p.has_private_bathroom}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniquePricings.length > 0) {
        await db.roomPricing.createMany({ data: uniquePricings });
      }

      await db.event.update({
        where: { id: eventId },
        data: { pricing_by_room_type: true },
      });
    }
  },

  async getRoomTypes(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    const rooms = await db.room.findMany({
      where: { event_id: eventId },
      select: { capacity: true, has_private_bathroom: true },
      orderBy: [{ capacity: "asc" }, { has_private_bathroom: "asc" }],
    });

    const typeMap = new Map<string, { capacity: number; hasPrivateBathroom: boolean; quantity: number }>();
    for (const r of rooms) {
      const key = `${r.capacity}-${r.has_private_bathroom}`;
      const existing = typeMap.get(key);
      if (existing) {
        existing.quantity += 1;
      } else {
        typeMap.set(key, { capacity: r.capacity, hasPrivateBathroom: r.has_private_bathroom, quantity: 1 });
      }
    }

    return Array.from(typeMap.values());
  },

  async addRoomsToEvent(
    eventId: string,
    ctx: AuthContext,
    types: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[],
    pricingByRoomType?: boolean
  ) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    // Get current max internal_number to continue numbering
    const existingRooms = await db.room.findMany({
      where: { event_id: eventId },
      select: { internal_number: true },
      orderBy: { internal_number: "desc" },
      take: 1,
    });

    let counter = existingRooms.length > 0
      ? parseInt(existingRooms[0].internal_number) + 1
      : 1;

    const rooms: {
      event_id: string;
      internal_number: string;
      display_name: string;
      capacity: number;
      has_private_bathroom: boolean;
    }[] = [];

    for (const type of types) {
      for (let i = 0; i < type.quantity; i++) {
        const num = String(counter).padStart(2, "0");
        rooms.push({
          event_id: eventId,
          internal_number: num,
          display_name: `Hab ${num}`,
          capacity: type.capacity,
          has_private_bathroom: type.hasPrivateBathroom,
        });
        counter++;
      }
    }

    await db.room.createMany({ data: rooms });

    // Upsert room pricings if pricing by room type
    if (pricingByRoomType) {
      for (const t of types) {
        if (t.price == null) continue;
        const key = { event_id: eventId, capacity: t.capacity, has_private_bathroom: t.hasPrivateBathroom };
        await db.roomPricing.upsert({
          where: { event_id_capacity_has_private_bathroom: key },
          update: { price: t.price, ...(t.dailyRate != null && { daily_rate: t.dailyRate }) },
          create: { ...key, price: t.price, ...(t.dailyRate != null && { daily_rate: t.dailyRate }) },
        });
      }

      await db.event.update({
        where: { id: eventId },
        data: { pricing_by_room_type: true },
      });
    }
  },

  async addRoomsByType(
    eventId: string,
    roomTypeId: string,
    quantity: number,
    ctx: AuthContext
  ) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    const roomType = await db.roomType.findUnique({ where: { id: roomTypeId } });
    if (!roomType) throw new Error("Tipo de habitación no encontrado");

    // Get current max internal_number to continue numbering
    const lastRoom = await db.room.findFirst({
      where: { event_id: eventId },
      orderBy: { internal_number: "desc" },
      select: { internal_number: true },
    });

    let counter = lastRoom ? parseInt(lastRoom.internal_number) + 1 : 1;

    const rooms: {
      event_id: string;
      internal_number: string;
      display_name: string;
      capacity: number;
      has_private_bathroom: boolean;
      room_type_id: string;
    }[] = [];

    for (let i = 0; i < quantity; i++) {
      const num = String(counter).padStart(2, "0");
      rooms.push({
        event_id: eventId,
        internal_number: num,
        display_name: `${roomType.name} ${num}`,
        capacity: roomType.capacity,
        has_private_bathroom: roomType.has_private_bathroom,
        room_type_id: roomType.id,
      });
      counter++;
    }

    await db.room.createMany({ data: rooms });
  },

  async getRoomPricings(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");
    return db.roomPricing.findMany({
      where: { event_id: eventId },
      orderBy: [{ capacity: "asc" }, { has_private_bathroom: "asc" }],
    });
  },

  async updateRoomPricings(
    eventId: string,
    ctx: AuthContext,
    pricings: { capacity: number; has_private_bathroom: boolean; price: number; daily_rate?: number | null }[]
  ) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    // Delete existing and recreate
    await db.roomPricing.deleteMany({ where: { event_id: eventId } });
    if (pricings.length > 0) {
      await db.roomPricing.createMany({
        data: pricings.map((p) => ({
          event_id: eventId,
          capacity: p.capacity,
          has_private_bathroom: p.has_private_bathroom,
          price: p.price,
          ...(p.daily_rate != null && { daily_rate: p.daily_rate }),
        })),
      });
    }
  },

  async deleteEvent(eventId: string, ctx: AuthContext) {
    if (!(await isEventOwner(ctx, eventId))) throw new Error("Solo el propietario puede eliminar el evento");

    await db.event.delete({ where: { id: eventId } });
  },

  async getEventForDetail(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) return null;

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        image_url: true,
        date_start: true,
        date_end: true,
        estimated_participants: true,
        user_id: true,
        participant_discovery: true,
        event_price: true,
        deposit_amount: true,
        pricing_by_room_type: true,
        pricing_mode: true,
        facilitation_cost_day: true,
        management_cost_day: true,
        meal_cost_breakfast: true,
        meal_cost_lunch: true,
        meal_cost_dinner: true,
        venue_id: true,
        _count: { select: { rooms: true } },
      },
    });

    if (!event) return null;

    return {
      ...event,
      roomCount: event._count.rooms,
      isOwner: event.user_id === ctx.userId || ctx.role === "admin",
    };
  },

  async updateEventDetails(
    eventId: string,
    ctx: AuthContext,
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
      management_cost_day?: number | null;
      meal_cost_breakfast?: number | null;
      meal_cost_lunch?: number | null;
      meal_cost_dinner?: number | null;
      show_accommodation?: boolean;
      show_availability?: boolean;
    }
  ) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    return db.event.update({
      where: { id: eventId },
      data: {
        name: data.name,
        description: data.description,
        location: data.location,
        image_url: data.image_url,
        ...(data.date_start && { date_start: new Date(data.date_start) }),
        ...(data.date_end && { date_end: new Date(data.date_end) }),
        ...(data.event_price !== undefined && { event_price: data.event_price }),
        ...(data.deposit_amount !== undefined && { deposit_amount: data.deposit_amount }),
        ...(data.pricing_by_room_type !== undefined && { pricing_by_room_type: data.pricing_by_room_type }),
        ...(data.pricing_mode !== undefined && { pricing_mode: data.pricing_mode }),
        ...(data.facilitation_cost_day !== undefined && { facilitation_cost_day: data.facilitation_cost_day }),
        ...(data.management_cost_day !== undefined && { management_cost_day: data.management_cost_day }),
        ...(data.meal_cost_breakfast !== undefined && { meal_cost_breakfast: data.meal_cost_breakfast }),
        ...(data.meal_cost_lunch !== undefined && { meal_cost_lunch: data.meal_cost_lunch }),
        ...(data.meal_cost_dinner !== undefined && { meal_cost_dinner: data.meal_cost_dinner }),
        ...(data.show_accommodation !== undefined && { show_accommodation: data.show_accommodation }),
        ...(data.show_availability !== undefined && { show_availability: data.show_availability }),
      },
    });
  },

  async updateParticipantDiscovery(eventId: string, ctx: AuthContext, enabled: boolean) {
    if (!(await isEventOwner(ctx, eventId))) throw new Error("Solo el propietario puede cambiar esta configuración");
    return db.event.update({
      where: { id: eventId },
      data: { participant_discovery: enabled },
    });
  },

  async getEventWithRooms(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) return null;

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        rooms: {
          orderBy: { internal_number: "asc" },
          include: {
            _count: { select: { event_persons: true } },
            event_persons: {
              select: {
                id: true,
                status: true,
                role: true,
                companion_id: true,
                dietary_notified: true,
                requests_text: true,
                requests_managed: true,
                accommodation_room_type_id: true,
                person: {
                  select: {
                    gender: true,
                    name_display: true,
                    name_initials: true,
                    dietary_requirements: true,
                    allergies_text: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!event) return null;

    const totalPersons = await db.eventPerson.count({
      where: { event_id: eventId },
    });
    const assignedCount = await db.eventPerson.count({
      where: { event_id: eventId, room_id: { not: null } },
    });

    return {
      ...event,
      totalPersons,
      assignedCount,
      unassignedCount: totalPersons - assignedCount,
    };
  },
};
