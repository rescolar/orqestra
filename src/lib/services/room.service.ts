import { db } from "@/lib/db";
import { GenderRestriction } from "@prisma/client";
import type { AuthContext } from "./auth-context";
import { canAccessEvent } from "./auth-context";

export const RoomService = {
  async createRoom(
    eventId: string,
    ctx: AuthContext,
    data: {
      display_name?: string;
      capacity?: number;
      has_private_bathroom?: boolean;
      gender_restriction?: GenderRestriction;
    }
  ) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");

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
    ctx: AuthContext,
    data: {
      display_name?: string;
      capacity?: number;
      has_private_bathroom?: boolean;
      gender_restriction?: GenderRestriction;
      locked?: boolean;
      locked_reason?: string;
      description?: string;
      conflict_acknowledged?: boolean;
    }
  ) {
    const room = await db.room.findUnique({
      where: { id: roomId },
      select: { id: true, event_id: true },
    });
    if (!room) throw new Error("Habitación no encontrada");
    if (!(await canAccessEvent(ctx, room.event_id)))
      throw new Error("Habitación no encontrada");

    return db.room.update({
      where: { id: roomId },
      data,
    });
  },

  async getRoomDetail(roomId: string, ctx: AuthContext) {
    const room = await db.room.findUnique({
      where: { id: roomId },
      include: {
        event_persons: {
          include: {
            person: {
              select: {
                name_full: true,
                name_display: true,
                name_initials: true,
                gender: true,
              },
            },
          },
          orderBy: { person: { name_full: "asc" } },
        },
      },
    });
    if (!room) throw new Error("Habitación no encontrada");
    if (!(await canAccessEvent(ctx, room.event_id)))
      throw new Error("Habitación no encontrada");
    return room;
  },

  async deleteRoom(roomId: string, ctx: AuthContext) {
    const room = await db.room.findUnique({
      where: { id: roomId },
      select: { id: true, event_id: true },
    });
    if (!room) throw new Error("Habitación no encontrada");
    if (!(await canAccessEvent(ctx, room.event_id)))
      throw new Error("Habitación no encontrada");

    await db.room.delete({ where: { id: roomId } });
  },
};
