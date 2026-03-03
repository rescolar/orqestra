import { db } from "@/lib/db";

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
};

export const KitchenService = {
  async getKitchenReport(
    eventId: string,
    userId: string
  ): Promise<KitchenReportRow[]> {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
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
      },
      orderBy: { person: { name_display: "asc" } },
    });
  },

  async updateMealFlags(
    eventPersonId: string,
    userId: string,
    data: { arrives_for_dinner?: boolean; last_meal_lunch?: boolean }
  ) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId, event: { user_id: userId } },
      select: { id: true },
    });
    if (!ep) throw new Error("Participante no encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data,
    });
  },

  async markAllDietaryNotified(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    return db.eventPerson.updateMany({
      where: {
        event_id: eventId,
        dietary_notified: false,
        OR: [
          { person: { dietary_requirements: { isEmpty: false } } },
          { person: { allergies_text: { not: null } } },
        ],
      },
      data: { dietary_notified: true },
    });
  },
};
