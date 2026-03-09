import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { KitchenReportRow } from "@/lib/services/kitchen.service";
import type { ReceptionPerson, ReceptionPricing } from "@/lib/services/reception.service";
import type { AuthContext } from "./auth-context";
import { canAccessEvent } from "./auth-context";

export const CentroShareService = {
  async getOrCreateToken(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");
    const event = await db.event.findFirst({
      where: { id: eventId },
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

  async revokeToken(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    await db.centroShareToken.deleteMany({
      where: { event_id: eventId },
    });
  },

  async regenerateToken(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");
    const event = await db.event.findFirst({
      where: { id: eventId },
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

  async getTokenInfo(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    return db.centroShareToken.findUnique({
      where: { event_id: eventId },
    });
  },

  async getPublicEventInfo(token: string) {
    const record = await db.centroShareToken.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            name: true,
            date_start: true,
            date_end: true,
            location: true,
            description: true,
            user: { select: { name: true } },
            _count: {
              select: {
                event_persons: {
                  where: { status: { in: ["reservado", "pagado", "confirmado_sin_pago"] } },
                },
              },
            },
          },
        },
      },
    });

    if (!record || record.expires_at < new Date()) return null;

    const { event } = record;
    return {
      name: event.name,
      dateStart: event.date_start,
      dateEnd: event.date_end,
      location: event.location,
      description: event.description,
      organizerName: event.user.name,
      confirmedCount: event._count.event_persons,
    };
  },

  async getPublicKitchenReport(
    token: string
  ): Promise<{ eventName: string; rows: KitchenReportRow[] } | null> {
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

    const rows = await db.eventPerson.findMany({
      where: {
        event_id: record.event.id,
        status: { not: "cancelado" },
      },
      select: {
        id: true,
        role: true,
        status: true,
        dietary_notified: true,
        arrives_for_dinner: true,
        last_meal_lunch: true,
        requests_text: true,
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

    return { eventName: record.event.name, rows };
  },

  async getPublicReceptionReport(
    token: string
  ): Promise<{
    eventName: string;
    dateStart: Date;
    dateEnd: Date;
    participants: ReceptionPerson[];
    pricing: ReceptionPricing;
  } | null> {
    const record = await db.centroShareToken.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            date_start: true,
            date_end: true,
            event_price: true,
            deposit_amount: true,
            pricing_by_room_type: true,
          },
        },
      },
    });

    if (!record || record.expires_at < new Date()) return null;

    const eventId = record.event.id;

    const [participants, roomPricings] = await Promise.all([
      db.eventPerson.findMany({
        where: {
          event_id: eventId,
          status: { not: "cancelado" },
        },
        select: {
          id: true,
          role: true,
          status: true,
          checked_in_at: true,
          amount_paid: true,
          payment_note: true,
          arrives_for_dinner: true,
          last_meal_lunch: true,
          requests_text: true,
          requests_managed: true,
          person: {
            select: {
              name_full: true,
              name_display: true,
              gender: true,
              contact_phone: true,
              contact_email: true,
              dietary_requirements: true,
              allergies_text: true,
            },
          },
          room: {
            select: {
              id: true,
              display_name: true,
              internal_number: true,
              capacity: true,
              has_private_bathroom: true,
            },
          },
        },
        orderBy: { person: { name_display: "asc" } },
      }),
      record.event.pricing_by_room_type
        ? db.roomPricing.findMany({
            where: { event_id: eventId },
            select: { capacity: true, has_private_bathroom: true, price: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      eventName: record.event.name,
      dateStart: record.event.date_start,
      dateEnd: record.event.date_end,
      participants: participants.map((p) => ({
        ...p,
        amount_paid: p.amount_paid ? Number(p.amount_paid) : null,
      })),
      pricing: {
        eventPrice: record.event.event_price ? Number(record.event.event_price) : null,
        depositAmount: record.event.deposit_amount ? Number(record.event.deposit_amount) : null,
        pricingByRoomType: record.event.pricing_by_room_type,
        roomPricings: roomPricings.map((rp) => ({
          capacity: rp.capacity,
          has_private_bathroom: rp.has_private_bathroom,
          price: Number(rp.price),
        })),
      },
    };
  },
};
