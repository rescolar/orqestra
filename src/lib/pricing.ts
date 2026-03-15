/**
 * Shared pricing module for Orqestra.
 *
 * Centralizes price resolution, discount calculation, and total computation.
 * Used by: person-detail-panel, reception-client, CSV export, participant view.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoomPricingEntry {
  capacity: number;
  has_private_bathroom: boolean;
  price: number;
  daily_rate?: number | null;
}

export interface OccupancyPricingEntry {
  occupancy: number;
  price: number;
}

export interface RoomTypeInfo {
  capacity: number;
  has_private_bathroom: boolean;
  base_price: number | null;
  occupancy_pricings: OccupancyPricingEntry[];
}

export interface EventPricingConfig {
  event_price: number | null;
  deposit_amount: number | null;
  pricing_by_room_type?: boolean;
  pricing_mode?: string; // "direct" | "breakdown"
  facilitation_cost_day?: number | null;
  facilitation_cost_half_day?: number | null;
  management_cost_day?: number | null;
  room_pricings?: RoomPricingEntry[];
  meal_costs?: { breakfast: number | null; lunch: number | null; dinner: number | null };
  event_dates?: { start: string; end: string };
}

export interface PersonForPricing {
  room?: { capacity: number; has_private_bathroom: boolean; room_type_id?: string | null } | null;
  date_arrival?: string | null;
  date_departure?: string | null;
  discount_breakfast: number;
  discount_lunch: number;
  discount_dinner: number;
  accommodation_room_type_id?: string | null;
  accommodation_occupancy?: number | null;
}

// ─── Core functions ─────────────────────────────────────────────────────────

/**
 * Resolve the per-person price for a room type + occupancy.
 * If the room type has OccupancyPricing for the current occupancy, use it.
 * Otherwise, fall back to the room type's base_price.
 */
export function resolveRoomTypePrice(
  roomType: RoomTypeInfo,
  currentOccupancy: number
): number | null {
  if (roomType.occupancy_pricings.length > 0) {
    const match = roomType.occupancy_pricings.find((op) => op.occupancy === currentOccupancy);
    if (match) return match.price;
  }
  return roomType.base_price;
}

/**
 * Resolve the base price for a person based on event pricing config.
 * Supports both legacy (RoomPricing by capacity+bathroom) and new (RoomType) systems.
 */
export function resolvePrice(
  person: PersonForPricing,
  pricing: EventPricingConfig
): number | null {
  if (pricing.pricing_by_room_type) {
    if (!person.room) return null;
    const match = pricing.room_pricings?.find(
      (rp) =>
        rp.capacity === person.room!.capacity &&
        rp.has_private_bathroom === person.room!.has_private_bathroom
    );
    return match?.price ?? null;
  }
  return pricing.event_price;
}

/**
 * Compute discount breakdown: day discount + meal discount.
 * Returns individual components for UI display.
 */
export function computeDiscount(opts: {
  eventDates?: { start: string; end: string };
  dateArrival: string | null;
  dateDeparture: string | null;
  dailyRate: number | null;
  facilitationCostDay?: number | null;
  managementCostDay?: number | null;
  discountBreakfast: number;
  discountLunch: number;
  discountDinner: number;
  mealCosts?: { breakfast: number | null; lunch: number | null; dinner: number | null };
}): { dayDiscount: number; daysLess: number; mealDiscount: number; total: number } {
  let dayDiscount = 0;
  let daysLess = 0;

  // dailyRate = accommodation per night; add facilitation + management when in breakdown mode
  const effectiveDailyRate = (opts.dailyRate ?? 0)
    + (opts.facilitationCostDay ?? 0)
    + (opts.managementCostDay ?? 0);

  if (opts.eventDates && effectiveDailyRate > 0) {
    const eventStart = new Date(opts.eventDates.start);
    const eventEnd = new Date(opts.eventDates.end);
    const arrival = opts.dateArrival ? new Date(opts.dateArrival) : eventStart;
    const departure = opts.dateDeparture ? new Date(opts.dateDeparture) : eventEnd;
    const eventDays = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
    const personDays = Math.round((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
    daysLess = Math.max(0, eventDays - personDays);
    dayDiscount = daysLess * effectiveDailyRate;
  }

  const mc = opts.mealCosts;
  const mealDiscount =
    (opts.discountBreakfast * (mc?.breakfast ?? 0)) +
    (opts.discountLunch * (mc?.lunch ?? 0)) +
    (opts.discountDinner * (mc?.dinner ?? 0));

  return { dayDiscount, daysLess, mealDiscount, total: dayDiscount + mealDiscount };
}

/**
 * Compute the total discount amount for a person.
 */
export function resolveDiscount(
  person: PersonForPricing,
  pricing: EventPricingConfig
): number {
  let dailyRate: number | null = null;

  if (pricing.pricing_by_room_type && person.room && pricing.room_pricings) {
    const match = pricing.room_pricings.find(
      (rp) =>
        rp.capacity === person.room!.capacity &&
        rp.has_private_bathroom === person.room!.has_private_bathroom
    );
    dailyRate = match?.daily_rate ?? null;
  }

  const disc = computeDiscount({
    eventDates: pricing.event_dates,
    dateArrival: person.date_arrival ?? null,
    dateDeparture: person.date_departure ?? null,
    dailyRate,
    facilitationCostDay: pricing.pricing_mode === "breakdown" ? pricing.facilitation_cost_day : null,
    managementCostDay: pricing.pricing_mode === "breakdown" ? pricing.management_cost_day : null,
    discountBreakfast: person.discount_breakfast,
    discountLunch: person.discount_lunch,
    discountDinner: person.discount_dinner,
    mealCosts: pricing.meal_costs,
  });

  return disc.total;
}

/**
 * Compute the final amount owed (price - discount, min 0).
 */
export function resolveAmountOwed(
  person: PersonForPricing,
  pricing: EventPricingConfig
): number | null {
  const price = resolvePrice(person, pricing);
  if (price == null) return null;
  const discount = resolveDiscount(person, pricing);
  return Math.max(0, price - discount);
}

/**
 * Compute the total event price for a person (for breakdown mode).
 * Total = accommodation + facilitation + management - meal discounts
 */
export function computeTotalEventPrice(params: {
  accommodationPerNight: number;
  nights: number;
  days: number;
  pricingMode: string;
  facilitationCostDay?: number | null;
  managementCostDay?: number | null;
  mealDiscount?: number;
}): number {
  const accommodation = params.accommodationPerNight * params.nights;

  if (params.pricingMode === "breakdown") {
    const facilitation = (params.facilitationCostDay ?? 0) * params.days;
    const management = (params.managementCostDay ?? 0) * params.days;
    return accommodation + facilitation + management - (params.mealDiscount ?? 0);
  }

  // Direct mode: accommodation price already includes everything
  return accommodation * 1 - (params.mealDiscount ?? 0);
}

/**
 * Helper: compute number of nights from event dates.
 */
export function computeNights(dateStart: string | Date, dateEnd: string | Date): number {
  const start = typeof dateStart === "string" ? new Date(dateStart) : dateStart;
  const end = typeof dateEnd === "string" ? new Date(dateEnd) : dateEnd;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}
