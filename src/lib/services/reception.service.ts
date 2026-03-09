import { db } from "@/lib/db";
import type { AuthContext } from "./auth-context";
import { canAccessEvent } from "./auth-context";

export type ReceptionPerson = {
  id: string;
  role: string;
  status: string;
  checked_in_at: Date | null;
  amount_paid: number | null;
  payment_note: string | null;
  arrives_for_dinner: boolean;
  last_meal_lunch: boolean;
  requests_text: string | null;
  requests_managed: boolean;
  person: {
    name_full: string;
    name_display: string;
    gender: string;
    contact_phone: string | null;
    contact_email: string | null;
    dietary_requirements: string[];
    allergies_text: string | null;
  };
  room: {
    id: string;
    display_name: string | null;
    internal_number: string;
    capacity: number;
    has_private_bathroom: boolean;
  } | null;
};

export type ReceptionPricing = {
  eventPrice: number | null;
  depositAmount: number | null;
  pricingByRoomType: boolean;
  roomPricings: { capacity: number; has_private_bathroom: boolean; price: number }[];
};

export type ReceptionRoom = {
  id: string;
  internal_number: string;
  display_name: string | null;
  capacity: number;
  has_private_bathroom: boolean;
  event_persons: {
    id: string;
    person: {
      name_full: string;
    };
  }[];
};

export const ReceptionService = {
  async getReceptionData(
    eventId: string,
    ctx: AuthContext
  ): Promise<{ event: { name: string; date_start: Date; date_end: Date }; participants: ReceptionPerson[]; pricing: ReceptionPricing }> {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");

    const event = await db.event.findFirst({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        date_start: true,
        date_end: true,
        event_price: true,
        deposit_amount: true,
        pricing_by_room_type: true,
      },
    });
    if (!event) throw new Error("Evento no encontrado");

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
      event.pricing_by_room_type
        ? db.roomPricing.findMany({
            where: { event_id: eventId },
            select: { capacity: true, has_private_bathroom: true, price: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      event,
      participants: participants.map((p) => ({
        ...p,
        amount_paid: p.amount_paid ? Number(p.amount_paid) : null,
      })),
      pricing: {
        eventPrice: event.event_price ? Number(event.event_price) : null,
        depositAmount: event.deposit_amount ? Number(event.deposit_amount) : null,
        pricingByRoomType: event.pricing_by_room_type,
        roomPricings: roomPricings.map((rp) => ({
          capacity: rp.capacity,
          has_private_bathroom: rp.has_private_bathroom,
          price: Number(rp.price),
        })),
      },
    };
  },

  async checkIn(eventPersonId: string, ctx: AuthContext) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      select: { id: true, event_id: true },
    });
    if (!ep) throw new Error("Participante no encontrado");
    if (!(await canAccessEvent(ctx, ep.event_id)))
      throw new Error("Participante no encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data: { checked_in_at: new Date() },
    });
  },

  async undoCheckIn(eventPersonId: string, ctx: AuthContext) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      select: { id: true, event_id: true },
    });
    if (!ep) throw new Error("Participante no encontrado");
    if (!(await canAccessEvent(ctx, ep.event_id)))
      throw new Error("Participante no encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data: { checked_in_at: null },
    });
  },

  async getReceptionPrintData(
    eventId: string,
    ctx: AuthContext
  ): Promise<{ event: { name: string; date_start: Date; date_end: Date }; participants: ReceptionPerson[]; rooms: ReceptionRoom[]; pricing: ReceptionPricing }> {
    const { event, participants, pricing } = await this.getReceptionData(eventId, ctx);

    const rooms = await db.room.findMany({
      where: {
        event_id: eventId,
        event_persons: { some: {} },
      },
      select: {
        id: true,
        internal_number: true,
        display_name: true,
        capacity: true,
        has_private_bathroom: true,
        event_persons: {
          where: { status: { not: "cancelado" } },
          select: {
            id: true,
            person: {
              select: { name_full: true },
            },
          },
          orderBy: { person: { name_display: "asc" } },
        },
      },
      orderBy: { internal_number: "asc" },
    });

    return { event, participants, rooms, pricing };
  },
};
