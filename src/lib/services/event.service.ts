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

      // Pending count: dietary + conflicts + tentatives + requests
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

      const tentativeCount = event.event_persons.filter((ep) => ep.status === "tentative").length;
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
        pending_count: dietaryCount + conflictCount + tentativeCount + requestCount,
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
      },
    });
  },

  async createRoomsFromTypes(
    eventId: string,
    ctx: AuthContext,
    types: { capacity: number; hasPrivateBathroom: boolean; quantity: number }[]
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
      },
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
                inseparable_with_id: true,
                dietary_notified: true,
                requests_text: true,
                requests_managed: true,
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
