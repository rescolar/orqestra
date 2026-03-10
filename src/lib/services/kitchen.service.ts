import { db } from "@/lib/db";
import type { AuthContext } from "./auth-context";
import { canAccessEvent } from "./auth-context";

export type MealDay = {
  day_index: number;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

export type KitchenReportRow = {
  id: string;
  role: string;
  status: string;
  dietary_notified: boolean;
  arrives_for_dinner: boolean;
  last_meal_lunch: boolean;
  requests_text: string | null;
  discount_breakfast: number;
  discount_lunch: number;
  discount_dinner: number;
  has_meal_discounts: boolean;
  meal_days: MealDay[];
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

export type KitchenEventDates = {
  dateStart: Date;
  dateEnd: Date;
  totalDays: number;
};

export function computeDefaultMeals(
  dayIndex: number,
  totalDays: number,
  arrivalDay: number,
  departureDay: number,
  arrivesForDinner: boolean,
  lastMealLunch: boolean
): { breakfast: boolean; lunch: boolean; dinner: boolean } {
  if (dayIndex < arrivalDay || dayIndex > departureDay) {
    return { breakfast: false, lunch: false, dinner: false };
  }
  if (dayIndex === arrivalDay) {
    return { breakfast: false, lunch: false, dinner: arrivesForDinner };
  }
  if (dayIndex === departureDay) {
    return { breakfast: true, lunch: lastMealLunch, dinner: false };
  }
  return { breakfast: true, lunch: true, dinner: true };
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((e.getTime() - s.getTime()) / msPerDay) + 1;
}

function dayIndexOf(eventStart: Date, date: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const s = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((d.getTime() - s.getTime()) / msPerDay);
}

export const KitchenService = {
  async getKitchenReport(
    eventId: string,
    ctx: AuthContext
  ): Promise<{ rows: KitchenReportRow[]; eventDates: KitchenEventDates }> {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");

    const event = await db.event.findFirst({
      where: { id: eventId },
      select: { date_start: true, date_end: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const totalDays = daysBetween(event.date_start, event.date_end);

    const rawRows = await db.eventPerson.findMany({
      where: {
        event_id: eventId,
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
        date_arrival: true,
        date_departure: true,
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

    // Lazy init: create MealAttendance rows for persons who don't have them
    const needsInit = rawRows.filter((r) => r.meal_attendances.length === 0);
    if (needsInit.length > 0) {
      const allData: {
        event_person_id: string;
        day_index: number;
        breakfast: boolean;
        lunch: boolean;
        dinner: boolean;
      }[] = [];

      for (const ep of needsInit) {
        const arrivalDay = ep.date_arrival
          ? dayIndexOf(event.date_start, ep.date_arrival)
          : 0;
        const departureDay = ep.date_departure
          ? dayIndexOf(event.date_start, ep.date_departure)
          : totalDays - 1;

        for (let d = 0; d < totalDays; d++) {
          const meals = computeDefaultMeals(
            d,
            totalDays,
            arrivalDay,
            departureDay,
            ep.arrives_for_dinner,
            ep.last_meal_lunch
          );
          allData.push({
            event_person_id: ep.id,
            day_index: d,
            ...meals,
          });
        }
      }

      if (allData.length > 0) {
        await db.mealAttendance.createMany({ data: allData });
      }

      // Re-fetch meal_attendances for initialized persons
      const ids = needsInit.map((r) => r.id);
      const freshAttendances = await db.mealAttendance.findMany({
        where: { event_person_id: { in: ids } },
        select: {
          event_person_id: true,
          day_index: true,
          breakfast: true,
          lunch: true,
          dinner: true,
        },
        orderBy: { day_index: "asc" },
      });

      const byEpId = new Map<string, MealDay[]>();
      for (const a of freshAttendances) {
        const list = byEpId.get(a.event_person_id) || [];
        list.push({
          day_index: a.day_index,
          breakfast: a.breakfast,
          lunch: a.lunch,
          dinner: a.dinner,
        });
        byEpId.set(a.event_person_id, list);
      }

      for (const r of rawRows) {
        if (r.meal_attendances.length === 0) {
          (r as { meal_attendances: MealDay[] }).meal_attendances =
            byEpId.get(r.id) || [];
        }
      }
    }

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
      rows,
      eventDates: {
        dateStart: event.date_start,
        dateEnd: event.date_end,
        totalDays,
      },
    };
  },

  async updateMealAttendance(
    eventPersonId: string,
    dayIndex: number,
    field: "breakfast" | "lunch" | "dinner",
    value: boolean,
    ctx: AuthContext
  ) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      select: { id: true, event_id: true },
    });
    if (!ep) throw new Error("Participante no encontrado");
    if (!(await canAccessEvent(ctx, ep.event_id)))
      throw new Error("Participante no encontrado");

    return db.mealAttendance.upsert({
      where: {
        event_person_id_day_index: {
          event_person_id: eventPersonId,
          day_index: dayIndex,
        },
      },
      update: { [field]: value },
      create: {
        event_person_id: eventPersonId,
        day_index: dayIndex,
        [field]: value,
      },
    });
  },

  async updateMealFlags(
    eventPersonId: string,
    ctx: AuthContext,
    data: { arrives_for_dinner?: boolean; last_meal_lunch?: boolean }
  ) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      select: { id: true, event_id: true },
    });
    if (!ep) throw new Error("Participante no encontrado");
    if (!(await canAccessEvent(ctx, ep.event_id)))
      throw new Error("Participante no encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data,
    });
  },

  async markAllDietaryNotified(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");

    return db.eventPerson.updateMany({
      where: {
        event_id: eventId,
        dietary_notified: false,
      },
      data: { dietary_notified: true },
    });
  },
};
