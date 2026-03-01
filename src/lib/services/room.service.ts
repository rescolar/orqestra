import { db } from "@/lib/db";
import { GenderRestriction } from "@prisma/client";

export const RoomService = {
  async createRoom(
    eventId: string,
    userId: string,
    data: {
      display_name?: string;
      capacity?: number;
      has_private_bathroom?: boolean;
      gender_restriction?: GenderRestriction;
    }
  ) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const lastRoom = await db.room.findFirst({
      where: { event_id: eventId },
      orderBy: { internal_number: "desc" },
      select: { internal_number: true },
    });

    const nextNum = lastRoom ? parseInt(lastRoom.internal_number, 10) + 1 : 1;
    const internalNumber = String(nextNum).padStart(2, "0");

    return db.room.create({
      data: {
        event_id: eventId,
        internal_number: internalNumber,
        display_name: data.display_name || `Hab ${internalNumber}`,
        capacity: data.capacity ?? 2,
        has_private_bathroom: data.has_private_bathroom ?? false,
        gender_restriction: data.gender_restriction ?? "mixed",
      },
    });
  },

  async updateRoom(
    roomId: string,
    userId: string,
    data: {
      display_name?: string;
      capacity?: number;
      has_private_bathroom?: boolean;
      gender_restriction?: GenderRestriction;
      locked?: boolean;
      locked_reason?: string;
      description?: string;
    }
  ) {
    const room = await db.room.findFirst({
      where: { id: roomId, event: { user_id: userId } },
      select: { id: true },
    });
    if (!room) throw new Error("Habitación no encontrada");

    return db.room.update({
      where: { id: roomId },
      data,
    });
  },

  async deleteRoom(roomId: string, userId: string) {
    const room = await db.room.findFirst({
      where: { id: roomId, event: { user_id: userId } },
      select: { id: true },
    });
    if (!room) throw new Error("Habitación no encontrada");

    await db.room.delete({ where: { id: roomId } });
  },
};
