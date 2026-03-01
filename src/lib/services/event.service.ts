import { db } from "@/lib/db";

export const EventService = {
  async getEventsByUser(userId: string) {
    const events = await db.event.findMany({
      where: { user_id: userId },
      include: {
        _count: {
          select: { event_persons: true, rooms: true },
        },
        event_persons: {
          where: { room_id: { not: null } },
          select: { id: true },
        },
      },
      orderBy: { date_start: "desc" },
    });

    return events.map((event) => ({
      id: event.id,
      name: event.name,
      date_start: event.date_start,
      date_end: event.date_end,
      estimated_participants: event.estimated_participants,
      status: event.status,
      assigned_count: event.event_persons.length,
      room_count: event._count.rooms,
    }));
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
    userId: string,
    types: { capacity: number; hasPrivateBathroom: boolean; quantity: number }[]
  ) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

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

  async deleteEvent(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });

    if (!event) throw new Error("Evento no encontrado");

    await db.event.delete({ where: { id: eventId } });
  },

  async getEventWithRooms(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      include: {
        rooms: {
          orderBy: { internal_number: "asc" },
          include: {
            _count: { select: { event_persons: true } },
            event_persons: {
              select: { id: true, status: true, person: { select: { gender: true } } },
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
