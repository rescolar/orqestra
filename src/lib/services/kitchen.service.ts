import { db } from "@/lib/db";
import type { AuthContext } from "./auth-context";
import { ownershipFilter } from "./auth-context";

export type KitchenReportRow = {
  id: string;
  role: string;
  status: string;
  dietary_notified: boolean;
  arrives_for_dinner: boolean;
  last_meal_lunch: boolean;
  requests_text: string | null;
  person: {
    name_display: string;
    dietary_requirements: string[];
    allergies_text: string | null;
  };
  room: {
    display_name: string | null;
    internal_number: string;
  } | null;
};

export const KitchenService = {
  async getKitchenReport(
    eventId: string,
    ctx: AuthContext
  ): Promise<KitchenReportRow[]> {
    const event = await db.event.findFirst({
      where: { id: eventId, ...ownershipFilter(ctx) },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    return db.eventPerson.findMany({
      where: {
        event_id: eventId,
        status: { not: "cancelled" },
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
  },

  async updateMealFlags(
    eventPersonId: string,
    ctx: AuthContext,
    data: { arrives_for_dinner?: boolean; last_meal_lunch?: boolean }
  ) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId, event: ownershipFilter(ctx) },
      select: { id: true },
    });
    if (!ep) throw new Error("Participante no encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data,
    });
  },

  async markAllDietaryNotified(eventId: string, ctx: AuthContext) {
    const event = await db.event.findFirst({
      where: { id: eventId, ...ownershipFilter(ctx) },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    return db.eventPerson.updateMany({
      where: {
        event_id: eventId,
        dietary_notified: false,
      },
      data: { dietary_notified: true },
    });
  },
};
