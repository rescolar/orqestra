import { db } from "@/lib/db";
import { computeDiscount, computeNights, computeTotalEventPrice } from "@/lib/pricing";
import { Prisma } from "@prisma/client";
import type { AuthContext } from "./auth-context";
import { canAccessEvent } from "./auth-context";

type FeeMode = "total" | "per_person";

type CostManagerFacilitatorInput = {
  eventPersonId: string;
  personId: string;
  personName: string;
  roomTypeId?: string | null;
  roomTypeName?: string | null;
  roomPrice?: number | null;
  nights: number;
  feeMode: FeeMode;
  feeAmount: number;
};

type CostManagerExtraCostInput = {
  title: string;
  cost: number;
};

export type CostManagerSaveInput = {
  participants: number;
  days: number;
  organizationProfit: number;
  facilitators: CostManagerFacilitatorInput[];
  extraCosts: CostManagerExtraCostInput[];
};

export type CostManagerData = {
  organizationProfit: number;
  facilitators: Array<{
    eventPersonId: string;
    personId: string;
    personName: string;
    roomTypeId: string | null;
    roomTypeName: string | null;
    nights: number;
    feeMode: FeeMode;
    feeAmount: number;
  }>;
  extraCosts: Array<{
    title: string;
    cost: number;
  }>;
  totalPlannedCost: number;
  managementPerPersonDay: number;
};

export type EconomicReportData = {
  event: {
    id: string;
    name: string;
    date_start: Date;
    date_end: Date;
    estimated_participants: number;
  };
  income: {
    expected: number;
    paid: number;
    pending: number;
  };
  plannedCosts: {
    facilitatorFees: number;
    facilitatorLodging: number;
    eventCosts: number;
    organizationProfit: number;
    total: number;
  };
  facilitatorLines: Array<{
    eventPersonId: string;
    personName: string;
    feeTotal: number;
    lodgingTotal: number;
    total: number;
  }>;
  eventCostLines: Array<{
    category: "extra_cost" | "organization_profit";
    title: string;
    total: number;
  }>;
};

function parseJsonDescription<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function buildManagerDescription(meta: Record<string, unknown>): string {
  return JSON.stringify(meta);
}

const eventCostItemDelegate = db.eventCostItem;

function isMissingEventCostItemsTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === "P2021";
}

function getPricingForParticipant(params: {
  person: {
    room: {
      capacity: number;
      has_private_bathroom: boolean;
      room_type_id: string | null;
      _count: { event_persons: number };
      room_type: {
        base_price: unknown;
        occupancy_pricings: { occupancy: number; price: unknown }[];
      } | null;
    } | null;
    date_arrival: Date | null;
    date_departure: Date | null;
    discount_breakfast: number;
    discount_lunch: number;
    discount_dinner: number;
  };
  event: {
    pricing_by_room_type: boolean;
    pricing_mode: string;
    event_price: unknown;
    facilitation_cost_day: unknown;
    management_cost_day: unknown;
    meal_cost_breakfast: unknown;
    meal_cost_lunch: unknown;
    meal_cost_dinner: unknown;
    date_start: Date;
    date_end: Date;
  };
  roomPricings: Array<{
    capacity: number;
    has_private_bathroom: boolean;
    price: unknown;
    daily_rate: unknown;
  }>;
}) {
  const { person, event, roomPricings } = params;
  const eventNights = computeNights(event.date_start, event.date_end);

  let resolvedPrice: number | null = null;
  let dailyRate: number | null = null;

  if (event.pricing_by_room_type) {
    if (!person.room) return { resolvedPrice: null, amountOwed: null };

    const roomType = person.room.room_type;
    const occupancy = person.room._count.event_persons;

    if (roomType) {
      const match = roomType.occupancy_pricings.find((item) => item.occupancy === occupancy);
      const accommodationPerNight = match
        ? Number(match.price)
        : roomType.base_price != null
          ? Number(roomType.base_price)
          : null;

      if (accommodationPerNight != null && !Number.isNaN(accommodationPerNight)) {
        resolvedPrice = computeTotalEventPrice({
          accommodationPerNight,
          nights: eventNights,
          days: eventNights,
          pricingMode: event.pricing_mode,
          facilitationCostDay: event.facilitation_cost_day != null ? Number(event.facilitation_cost_day) : null,
          managementCostDay: event.management_cost_day != null ? Number(event.management_cost_day) : null,
        });
        dailyRate = accommodationPerNight;
      }
    }

    if (resolvedPrice == null) {
      const legacyPricing = roomPricings.find(
        (pricing) =>
          pricing.capacity === person.room!.capacity &&
          pricing.has_private_bathroom === person.room!.has_private_bathroom
      );

      if (legacyPricing) {
        resolvedPrice = Number(legacyPricing.price);
        dailyRate = legacyPricing.daily_rate != null ? Number(legacyPricing.daily_rate) : null;
      }
    }
  } else {
    resolvedPrice = event.event_price != null ? Number(event.event_price) : null;
  }

  if (resolvedPrice == null) {
    return { resolvedPrice: null, amountOwed: null };
  }

  const discount = computeDiscount({
    eventDates: {
      start: event.date_start.toISOString(),
      end: event.date_end.toISOString(),
    },
    dateArrival: person.date_arrival ? person.date_arrival.toISOString() : null,
    dateDeparture: person.date_departure ? person.date_departure.toISOString() : null,
    dailyRate,
    facilitationCostDay: event.pricing_mode === "breakdown" && event.facilitation_cost_day != null
      ? Number(event.facilitation_cost_day)
      : null,
    managementCostDay: event.pricing_mode === "breakdown" && event.management_cost_day != null
      ? Number(event.management_cost_day)
      : null,
    discountBreakfast: person.discount_breakfast,
    discountLunch: person.discount_lunch,
    discountDinner: person.discount_dinner,
    mealCosts: {
      breakfast: event.meal_cost_breakfast != null ? Number(event.meal_cost_breakfast) : null,
      lunch: event.meal_cost_lunch != null ? Number(event.meal_cost_lunch) : null,
      dinner: event.meal_cost_dinner != null ? Number(event.meal_cost_dinner) : null,
    },
  });

  return {
    resolvedPrice,
    amountOwed: Math.max(0, resolvedPrice - discount.total),
  };
}

export const EconomicsService = {
  async saveCostManagerData(eventId: string, ctx: AuthContext, data: CostManagerSaveInput) {
    if (!(await canAccessEvent(ctx, eventId))) {
      throw new Error("Evento no encontrado");
    }

    const facilitatorIds = [...new Set(data.facilitators.map((item) => item.eventPersonId))];
    const eventPersons = facilitatorIds.length > 0
      ? await db.eventPerson.findMany({
          where: {
            id: { in: facilitatorIds },
            event_id: eventId,
          },
          select: {
            id: true,
            person_id: true,
            person: { select: { name_full: true } },
          },
        })
      : [];

    const eventPersonMap = new Map(eventPersons.map((item) => [item.id, item]));
    for (const facilitator of data.facilitators) {
      if (!eventPersonMap.has(facilitator.eventPersonId)) {
        throw new Error("Hay facilitadores sin vincular correctamente al evento");
      }
    }

    const items: Array<{
      event_id: string;
      event_person_id?: string;
      scope: "event" | "facilitator";
      category: "facilitator_fee" | "facilitator_lodging" | "extra_cost" | "organization_profit";
      title: string;
      description?: string;
      quantity?: number;
      unit_amount?: number;
      total_amount: number;
      currency: string;
      source: string;
    }> = [];

    for (const facilitator of data.facilitators) {
      const eventPerson = eventPersonMap.get(facilitator.eventPersonId)!;
      const feeTotal = facilitator.feeMode === "per_person"
        ? facilitator.feeAmount * data.participants
        : facilitator.feeAmount;

      if (feeTotal > 0) {
        items.push({
          event_id: eventId,
          event_person_id: facilitator.eventPersonId,
          scope: "facilitator",
          category: "facilitator_fee",
          title: `Honorarios ${eventPerson.person.name_full}`,
          description: buildManagerDescription({
            feeMode: facilitator.feeMode,
            personId: facilitator.personId,
            personName: facilitator.personName,
          }),
          quantity: facilitator.feeMode === "per_person" ? data.participants : 1,
          unit_amount: facilitator.feeAmount,
          total_amount: roundMoney(feeTotal),
          currency: "EUR",
          source: "cost_manager",
        });
      }

      const selectedRoomTypeName = facilitator.roomTypeName?.trim() || null;
      const roomPrice = facilitator.roomPrice ?? null;
      if (selectedRoomTypeName && roomPrice != null && facilitator.nights > 0) {
        items.push({
          event_id: eventId,
          event_person_id: facilitator.eventPersonId,
          scope: "facilitator",
          category: "facilitator_lodging",
          title: `Alojamiento ${eventPerson.person.name_full}`,
          description: buildManagerDescription({
            roomTypeId: facilitator.roomTypeId ?? null,
            roomTypeName: selectedRoomTypeName,
            nights: facilitator.nights,
          }),
          quantity: facilitator.nights,
          unit_amount: roomPrice,
          total_amount: roundMoney(roomPrice * facilitator.nights),
          currency: "EUR",
          source: "cost_manager",
        });
      }
    }

    for (const extraCost of data.extraCosts) {
      if (!extraCost.title.trim() || extraCost.cost <= 0) continue;
      items.push({
        event_id: eventId,
        scope: "event",
        category: "extra_cost",
        title: extraCost.title.trim(),
        quantity: 1,
        unit_amount: extraCost.cost,
        total_amount: roundMoney(extraCost.cost),
        currency: "EUR",
        source: "cost_manager",
      });
    }

    if (data.organizationProfit > 0) {
      items.push({
        event_id: eventId,
        scope: "event",
        category: "organization_profit",
        title: "Beneficio organizacion",
        quantity: 1,
        unit_amount: data.organizationProfit,
        total_amount: roundMoney(data.organizationProfit),
        currency: "EUR",
        source: "cost_manager",
      });
    }

    await db.$transaction(async (tx) => {
      await tx.eventCostItem.deleteMany({
        where: {
          event_id: eventId,
          source: "cost_manager",
        },
      });

      if (items.length > 0) {
        await tx.eventCostItem.createMany({ data: items });
      }
    });

    const totalPlannedCost = items.reduce((sum, item) => sum + item.total_amount, 0);
    const managementPerPersonDay =
      data.participants > 0 && data.days > 0
        ? totalPlannedCost / (data.participants * data.days)
        : 0;

    return {
      totalPlannedCost: roundMoney(totalPlannedCost),
      managementPerPersonDay: roundMoney(managementPerPersonDay),
    };
  },

  async getCostManagerData(eventId: string, ctx: AuthContext): Promise<CostManagerData> {
    if (!(await canAccessEvent(ctx, eventId))) {
      throw new Error("Evento no encontrado");
    }

    const [event, facilitatorEventPersons, items] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: {
          estimated_participants: true,
          date_start: true,
          date_end: true,
        },
      }),
      db.eventPerson.findMany({
        where: {
          event_id: eventId,
          role: "facilitator",
        },
        select: {
          id: true,
          person: {
            select: {
              id: true,
              name_full: true,
            },
          },
          room: {
            select: {
              room_type_id: true,
              room_type: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { person: { name_full: "asc" } },
      }),
      eventCostItemDelegate.findMany({
        where: {
          event_id: eventId,
          source: "cost_manager",
        },
        include: {
          event_person: {
            include: {
              person: {
                select: {
                  id: true,
                  name_full: true,
                },
              },
            },
          },
        },
        orderBy: [{ created_at: "asc" }],
      }).catch((error: unknown) => {
        if (isMissingEventCostItemsTable(error)) return [];
        throw error;
      }),
    ]);

    const facilitatorMap = new Map<string, CostManagerData["facilitators"][number]>();
    const extraCosts: CostManagerData["extraCosts"] = [];
    let organizationProfit = 0;
    let totalPlannedCost = 0;

    for (const eventPerson of facilitatorEventPersons) {
      facilitatorMap.set(eventPerson.id, {
        eventPersonId: eventPerson.id,
        personId: eventPerson.person.id,
        personName: eventPerson.person.name_full,
        roomTypeId: eventPerson.room?.room_type_id ?? null,
        roomTypeName: eventPerson.room?.room_type?.name ?? null,
        nights: 0,
        feeMode: "total",
        feeAmount: 0,
      });
    }

    for (const item of items) {
      const totalAmount = Number(item.total_amount);
      totalPlannedCost += totalAmount;

      if (item.category === "organization_profit") {
        organizationProfit += totalAmount;
        continue;
      }

      if (item.category === "extra_cost") {
        extraCosts.push({
          title: item.title,
          cost: totalAmount,
        });
        continue;
      }

      if (!item.event_person || !item.event_person.person) continue;

      const existing = facilitatorMap.get(item.event_person.id) ?? {
        eventPersonId: item.event_person.id,
        personId: item.event_person.person.id,
        personName: item.event_person.person.name_full,
        roomTypeId: null,
        roomTypeName: null,
        nights: 0,
        feeMode: "total" as FeeMode,
        feeAmount: 0,
      };

      if (item.category === "facilitator_fee") {
        const meta = parseJsonDescription<{ feeMode?: FeeMode }>(item.description);
        existing.feeMode = meta?.feeMode === "per_person" ? "per_person" : "total";
        existing.feeAmount = item.unit_amount != null ? Number(item.unit_amount) : totalAmount;
      }

      if (item.category === "facilitator_lodging") {
        const meta = parseJsonDescription<{ roomTypeId?: string | null; roomTypeName?: string | null; nights?: number }>(item.description);
        existing.roomTypeId = meta?.roomTypeId ?? null;
        existing.roomTypeName = meta?.roomTypeName ?? item.title.replace(/^Alojamiento /, "");
        existing.nights = meta?.nights ?? (item.quantity != null ? Number(item.quantity) : 0);
      }

      facilitatorMap.set(item.event_person.id, existing);
    }

    const days = event ? computeNights(event.date_start, event.date_end) : 0;
    const managementPerPersonDay =
      event && event.estimated_participants > 0 && days > 0
        ? totalPlannedCost / (event.estimated_participants * days)
        : 0;

    return {
      organizationProfit: roundMoney(organizationProfit),
      facilitators: [...facilitatorMap.values()],
      extraCosts,
      totalPlannedCost: roundMoney(totalPlannedCost),
      managementPerPersonDay: roundMoney(managementPerPersonDay),
    };
  },

  async getEconomicReport(eventId: string, ctx: AuthContext): Promise<EconomicReportData> {
    if (!(await canAccessEvent(ctx, eventId))) {
      throw new Error("Evento no encontrado");
    }

    const event = await db.event.findFirst({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        date_start: true,
        date_end: true,
        estimated_participants: true,
        event_price: true,
        deposit_amount: true,
        pricing_by_room_type: true,
        pricing_mode: true,
        facilitation_cost_day: true,
        management_cost_day: true,
        meal_cost_breakfast: true,
        meal_cost_lunch: true,
        meal_cost_dinner: true,
      },
    });
    if (!event) throw new Error("Evento no encontrado");

    const [participants, roomPricings, plannedCostItems] = await Promise.all([
      db.eventPerson.findMany({
        where: {
          event_id: eventId,
          status: { not: "cancelado" },
        },
        select: {
          id: true,
          role: true,
          amount_paid: true,
          date_arrival: true,
          date_departure: true,
          discount_breakfast: true,
          discount_lunch: true,
          discount_dinner: true,
          person: {
            select: {
              name_full: true,
            },
          },
          room: {
            select: {
              capacity: true,
              has_private_bathroom: true,
              room_type_id: true,
              _count: { select: { event_persons: true } },
              room_type: {
                select: {
                  base_price: true,
                  occupancy_pricings: {
                    orderBy: { occupancy: "asc" },
                    select: { occupancy: true, price: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { person: { name_full: "asc" } },
      }),
      db.roomPricing.findMany({
        where: { event_id: eventId },
        select: {
          capacity: true,
          has_private_bathroom: true,
          price: true,
          daily_rate: true,
        },
      }),
      eventCostItemDelegate.findMany({
        where: {
          event_id: eventId,
          source: "cost_manager",
        },
        include: {
          event_person: {
            include: {
              person: {
                select: {
                  name_full: true,
                },
              },
            },
          },
        },
        orderBy: [{ created_at: "asc" }],
      }).catch((error: unknown) => {
        if (isMissingEventCostItemsTable(error)) return [];
        throw error;
      }),
    ]);

    let expected = 0;
    let paid = 0;

    for (const participant of participants) {
      if (participant.role === "facilitator") continue;
      const pricing = getPricingForParticipant({
        person: participant,
        event,
        roomPricings,
      });
      if (pricing.amountOwed != null) {
        expected += pricing.amountOwed;
      }
      paid += participant.amount_paid ? Number(participant.amount_paid) : 0;
    }

    const facilitatorMap = new Map<string, EconomicReportData["facilitatorLines"][number]>();
    const eventCostLines: EconomicReportData["eventCostLines"] = [];
    let facilitatorFees = 0;
    let facilitatorLodging = 0;
    let eventCosts = 0;
    let organizationProfit = 0;

    for (const item of plannedCostItems) {
      const total = Number(item.total_amount);
      if (item.category === "facilitator_fee") {
        facilitatorFees += total;
      }
      if (item.category === "facilitator_lodging") {
        facilitatorLodging += total;
      }
      if (item.category === "extra_cost") {
        eventCosts += total;
        eventCostLines.push({ category: "extra_cost", title: item.title, total });
      }
      if (item.category === "organization_profit") {
        organizationProfit += total;
        eventCostLines.push({ category: "organization_profit", title: item.title, total });
      }

      if (item.event_person?.person) {
        const key = item.event_person.id;
        const existing = facilitatorMap.get(key) ?? {
          eventPersonId: key,
          personName: item.event_person.person.name_full,
          feeTotal: 0,
          lodgingTotal: 0,
          total: 0,
        };

        if (item.category === "facilitator_fee") {
          existing.feeTotal += total;
        }
        if (item.category === "facilitator_lodging") {
          existing.lodgingTotal += total;
        }
        existing.total = existing.feeTotal + existing.lodgingTotal;
        facilitatorMap.set(key, existing);
      }
    }

    const plannedTotal = facilitatorFees + facilitatorLodging + eventCosts + organizationProfit;

    return {
      event: {
        id: event.id,
        name: event.name,
        date_start: event.date_start,
        date_end: event.date_end,
        estimated_participants: event.estimated_participants,
      },
      income: {
        expected: roundMoney(expected),
        paid: roundMoney(paid),
        pending: roundMoney(Math.max(0, expected - paid)),
      },
      plannedCosts: {
        facilitatorFees: roundMoney(facilitatorFees),
        facilitatorLodging: roundMoney(facilitatorLodging),
        eventCosts: roundMoney(eventCosts),
        organizationProfit: roundMoney(organizationProfit),
        total: roundMoney(plannedTotal),
      },
      facilitatorLines: [...facilitatorMap.values()].map((item) => ({
        ...item,
        feeTotal: roundMoney(item.feeTotal),
        lodgingTotal: roundMoney(item.lodgingTotal),
        total: roundMoney(item.total),
      })),
      eventCostLines: eventCostLines.map((item) => ({
        ...item,
        total: roundMoney(item.total),
      })),
    };
  },
};
