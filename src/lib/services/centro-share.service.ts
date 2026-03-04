import { randomBytes } from "crypto";
import { db } from "@/lib/db";

export type PublicKitchenRow = {
  name: string;
  room: string | null;
  dietary_requirements: string[];
  allergies_text: string | null;
  arrives_for_dinner: boolean;
  last_meal_lunch: boolean;
};

export type PublicKitchenReport = {
  eventName: string;
  rows: PublicKitchenRow[];
};

export const CentroShareService = {
  async getOrCreateToken(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true, date_end: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const existing = await db.centroShareToken.findUnique({
      where: { event_id: eventId },
    });
    if (existing) return existing;

    const token = randomBytes(24).toString("base64url");
    const expires_at = new Date(event.date_end.getTime() + 24 * 60 * 60 * 1000);

    return db.centroShareToken.create({
      data: { event_id: eventId, token, expires_at },
    });
  },

  async revokeToken(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    await db.centroShareToken.deleteMany({
      where: { event_id: eventId },
    });
  },

  async regenerateToken(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true, date_end: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const token = randomBytes(24).toString("base64url");
    const expires_at = new Date(event.date_end.getTime() + 24 * 60 * 60 * 1000);

    return db.$transaction(async (tx) => {
      await tx.centroShareToken.deleteMany({
        where: { event_id: eventId },
      });
      return tx.centroShareToken.create({
        data: { event_id: eventId, token, expires_at },
      });
    });
  },

  async getTokenInfo(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    return db.centroShareToken.findUnique({
      where: { event_id: eventId },
    });
  },

  async getPublicKitchenReport(
    token: string
  ): Promise<PublicKitchenReport | null> {
    const record = await db.centroShareToken.findUnique({
      where: { token },
      include: { event: { select: { id: true, name: true } } },
    });

    if (!record || record.expires_at < new Date()) return null;

    // Mark all dietary as notified (side-effect: cocina "received" the info)
    await db.eventPerson.updateMany({
      where: { event_id: record.event.id, dietary_notified: false },
      data: { dietary_notified: true },
    });

    const eventPersons = await db.eventPerson.findMany({
      where: {
        event_id: record.event.id,
        status: { not: "cancelled" },
      },
      select: {
        arrives_for_dinner: true,
        last_meal_lunch: true,
        person: {
          select: {
            name_display: true,
            dietary_requirements: true,
            allergies_text: true,
          },
        },
        room: {
          select: {
            display_name: true,
            internal_number: true,
          },
        },
      },
      orderBy: { person: { name_display: "asc" } },
    });

    return {
      eventName: record.event.name,
      rows: eventPersons.map((ep) => ({
        name: ep.person.name_display,
        room: ep.room?.display_name || ep.room?.internal_number || null,
        dietary_requirements: ep.person.dietary_requirements,
        allergies_text: ep.person.allergies_text,
        arrives_for_dinner: ep.arrives_for_dinner,
        last_meal_lunch: ep.last_meal_lunch,
      })),
    };
  },
};
