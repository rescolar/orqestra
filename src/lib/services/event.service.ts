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
    const n = data.estimated_participants;
    const roomCount = Math.ceil(n / 2);

    const event = await db.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          user_id: userId,
          name: data.name,
          date_start: data.date_start,
          date_end: data.date_end,
          estimated_participants: n,
          status: "active",
        },
      });

      await tx.room.createMany({
        data: Array.from({ length: roomCount }, (_, i) => ({
          event_id: created.id,
          internal_number: String(i + 1).padStart(2, "0"),
          display_name: `Hab ${String(i + 1).padStart(2, "0")}`,
          capacity: i === roomCount - 1 && n % 2 !== 0 ? 1 : 2,
        })),
      });

      return created;
    });

    return event;
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
    return db.event.findFirst({
      where: { id: eventId, user_id: userId },
      include: {
        rooms: { orderBy: { internal_number: "asc" } },
        _count: { select: { event_persons: true } },
      },
    });
  },
};
