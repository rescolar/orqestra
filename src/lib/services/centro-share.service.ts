import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { KitchenReportRow, KitchenEventDates } from "@/lib/services/kitchen.service";
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
  ): Promise<{ eventName: string; rows: KitchenReportRow[]; eventDates: KitchenEventDates } | null> {
    const record = await db.centroShareToken.findUnique({
      where: { token },
      include: { event: { select: { id: true, name: true, date_start: true, date_end: true } } },
    });

    if (!record || record.expires_at < new Date()) return null;

    // Mark all dietary as notified (side-effect: cocina "received" the info)
    await db.eventPerson.updateMany({
      where: { event_id: record.event.id, dietary_notified: false },
      data: { dietary_notified: true },
    });

    const msPerDay = 24 * 60 * 60 * 1000;
    const s = new Date(record.event.date_start.getFullYear(), record.event.date_start.getMonth(), record.event.date_start.getDate());
    const e = new Date(record.event.date_end.getFullYear(), record.event.date_end.getMonth(), record.event.date_end.getDate());
    const totalDays = Math.round((e.getTime() - s.getTime()) / msPerDay) + 1;

    const rawRows = await db.eventPerson.findMany({
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
        discount_breakfast: true,
        discount_lunch: true,
        discount_dinner: true,
        meal_attendances: {
          select: {
            day_index: true,
            breakfast: true,
            lunch: true,
            dinner: true,
          },
          orderBy: { day_index: "asc" },
        },
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

    const rows: KitchenReportRow[] = rawRows.map((r) => ({
      id: r.id,
      role: r.role,
      status: r.status,
      dietary_notified: r.dietary_notified,
      arrives_for_dinner: r.arrives_for_dinner,
      last_meal_lunch: r.last_meal_lunch,
      requests_text: r.requests_text,
      discount_breakfast: r.discount_breakfast,
      discount_lunch: r.discount_lunch,
      discount_dinner: r.discount_dinner,
      has_meal_discounts:
        r.discount_breakfast > 0 ||
        r.discount_lunch > 0 ||
        r.discount_dinner > 0,
      meal_days: r.meal_attendances.map((a) => ({
        day_index: a.day_index,
        breakfast: a.breakfast,
        lunch: a.lunch,
        dinner: a.dinner,
      })),
      person: r.person,
      room: r.room,
    }));

    return {
      eventName: record.event.name,
      rows,
      eventDates: {
        dateStart: record.event.date_start,
        dateEnd: record.event.date_end,
        totalDays,
      },
    };
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
            meal_cost_breakfast: true,
            meal_cost_lunch: true,
            meal_cost_dinner: true,
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
          date_arrival: true,
          date_departure: true,
          discount_breakfast: true,
          discount_lunch: true,
          discount_dinner: true,
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
            select: { capacity: true, has_private_bathroom: true, price: true, daily_rate: true },
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
          daily_rate: rp.daily_rate ? Number(rp.daily_rate) : null,
        })),
        mealCosts: {
          breakfast: record.event.meal_cost_breakfast ? Number(record.event.meal_cost_breakfast) : null,
          lunch: record.event.meal_cost_lunch ? Number(record.event.meal_cost_lunch) : null,
          dinner: record.event.meal_cost_dinner ? Number(record.event.meal_cost_dinner) : null,
        },
        eventDates: { start: record.event.date_start, end: record.event.date_end },
      },
    };
  },
};
