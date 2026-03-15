"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { computeDiscount, computeNights, computeTotalEventPrice } from "@/lib/pricing";
import {
  getEventPersonDetail,
  updateEventPerson,
  removeEventPerson,
} from "@/lib/actions/person";
import {
  removeMemberFromGroup,
  toggleInseparable,
} from "@/lib/actions/group";

type GroupMember = {
  id: string;
  companion_id: string | null;
  person: { name_display: string };
};

type GroupData = {
  id: string;
  name: string;
  members: GroupMember[];
};

type EventPersonDetail = {
  id: string;
  role: string;
  status: string;
  companion_id: string | null;
  dietary_notified: boolean;
  requests_text: string | null;
  requests_managed: boolean;
  amount_paid: unknown; // Prisma Decimal | null
  payment_note: string | null;
  date_arrival: string | null;
  date_departure: string | null;
  discount_breakfast: number;
  discount_lunch: number;
  discount_dinner: number;
  group: GroupData | null;
  room: {
    display_name: string | null;
    internal_number: string;
    capacity: number;
    has_private_bathroom: boolean;
    room_type_id: string | null;
    _count: { event_persons: number };
  } | null;
  person: {
    id: string;
    name_full: string;
    name_display: string;
    name_initials: string;
    gender: string;
    contact_email: string | null;
    contact_phone: string | null;
    contact_address: string | null;
    avatar_url: string | null;
    dietary_requirements: string[];
    allergies_text: string | null;
  };
};

export type PersonUpdateData = {
  role?: string;
  status?: string;
  gender?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  dietary_requirements?: string[];
  dietary_notified?: boolean;
  allergies_text?: string | null;
  requests_text?: string | null;
  requests_managed?: boolean;
  amount_paid?: number | null;
  payment_note?: string | null;
  date_arrival?: string | null;
  date_departure?: string | null;
  discount_breakfast?: number;
  discount_lunch?: number;
  discount_dinner?: number;
};

export type OptimisticRelation = {
  id: string;
  name_display: string;
};

type PersonDetailPanelProps = {
  eventPersonId: string;
  eventId: string;
  refreshKey?: number;
  optimisticRelation?: OptimisticRelation | null;
  isDragActive?: boolean;
  eventPricing?: {
    event_price: number | null;
    deposit_amount: number | null;
    pricing_by_room_type?: boolean;
    pricing_mode?: string;
    facilitation_cost_day?: number | null;
    management_cost_day?: number | null;
    room_pricings?: { capacity: number; has_private_bathroom: boolean; price: number; daily_rate?: number | null }[];
    occupancy_pricings?: Record<string, { occupancy: number; price: number }[]>;
    meal_costs?: { breakfast: number | null; lunch: number | null; dinner: number | null };
    event_dates?: { start: string; end: string };
  } | null;
  onClose: () => void;
  onPersonUpdated: (id: string, changes: PersonUpdateData) => void;
  onPersonRemoved: (id: string) => void;
  onPersonClick?: (id: string) => void;
  onBoardRefresh?: () => void;
};

// computeDiscount imported from shared pricing module

const ROLE_OPTIONS = [
  { value: "participant", label: "Participante" },
  { value: "facilitator", label: "Facilitador" },
] as const;

const STATUS_OPTIONS = [
  { value: "inscrito", label: "Inscrito" },
  { value: "reservado", label: "Reservado" },
  { value: "pagado", label: "Pagado" },
  { value: "confirmado_sin_pago", label: "Confirmado s/p" },
  { value: "solicita_cancelacion", label: "Solicita cancelación" },
  { value: "cancelado", label: "Cancelado" },
] as const;

const GENDER_OPTIONS = [
  { value: "male", label: "H" },
  { value: "female", label: "M" },
  { value: "other", label: "O" },
  { value: "unknown", label: "ND" },
] as const;

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "V" },
  { value: "gluten_free", label: "SG" },
  { value: "lactose_free", label: "SL" },
] as const;

const STORAGE_KEY_PREFIX = "orqestra:sections:";

const ALL_SECTIONS = ["Rol", "Estado", "Pago", "Genero", "Contacto", "Relaciones", "Dieta", "Alergias", "Preferencias"];

function readOpenSections(eventId: string): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + eventId);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  // Default: all sections open for first-time / demo experience
  return new Set(ALL_SECTIONS);
}

function writeOpenSections(eventId: string, sections: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + eventId, JSON.stringify([...sections]));
  } catch {}
}

export function PersonDetailPanel({
  eventPersonId,
  eventId,
  refreshKey,
  optimisticRelation,
  isDragActive,
  eventPricing,
  onClose,
  onPersonUpdated,
  onPersonRemoved,
  onPersonClick,
  onBoardRefresh,
}: PersonDetailPanelProps) {
  const [data, setData] = useState<EventPersonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeDetail = (raw: any): EventPersonDetail => ({
    ...raw,
    date_arrival: raw.date_arrival ? new Date(raw.date_arrival).toISOString() : null,
    date_departure: raw.date_departure ? new Date(raw.date_departure).toISOString() : null,
  });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [relationsIsOver, setRelationsIsOver] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(() => readOpenSections(eventId));

  const toggleSection = useCallback(
    (label: string) => {
      setOpenSections((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        writeOpenSections(eventId, next);
        return next;
      });
    },
    [eventId]
  );
  const [emailLocal, setEmailLocal] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [addressLocal, setAddressLocal] = useState("");
  const [allergiesLocal, setAllergiesLocal] = useState("");
  const [requestsLocal, setRequestsLocal] = useState("");
  const [amountPaidLocal, setAmountPaidLocal] = useState("");
  const [paymentNoteLocal, setPaymentNoteLocal] = useState("");
  const [dateArrivalLocal, setDateArrivalLocal] = useState("");
  const [dateDepartureLocal, setDateDepartureLocal] = useState("");
  const [discountBreakfastLocal, setDiscountBreakfastLocal] = useState("0");
  const [discountLunchLocal, setDiscountLunchLocal] = useState("0");
  const [discountDinnerLocal, setDiscountDinnerLocal] = useState("0");

  const hasPricing = eventPricing?.event_price != null || eventPricing?.deposit_amount != null || eventPricing?.pricing_by_room_type;

  // Resolve effective price and daily_rate for this person based on their room
  const resolvedPricing = (() => {
    if (!eventPricing) return { price: null, dailyRate: null };
    if (eventPricing.pricing_by_room_type && data?.room) {
      // Try occupancy-based pricing first (via room_type_id)
      const roomTypeId = data.room.room_type_id;
      const currentOccupancy = data.room._count?.event_persons ?? 0;
      if (roomTypeId && eventPricing.occupancy_pricings?.[roomTypeId]) {
        const occPricings = eventPricing.occupancy_pricings[roomTypeId];
        const match = occPricings.find((op) => op.occupancy === currentOccupancy);
        if (match) {
          // For occupancy pricing, compute total event price (accommodation × nights + facilitation + management)
          const nights = eventPricing.event_dates
            ? computeNights(eventPricing.event_dates.start, eventPricing.event_dates.end)
            : 0;
          const total = computeTotalEventPrice({
            accommodationPerNight: match.price,
            nights,
            days: nights,
            pricingMode: eventPricing.pricing_mode ?? "direct",
            facilitationCostDay: eventPricing.facilitation_cost_day,
            managementCostDay: eventPricing.management_cost_day,
          });
          return { price: total, dailyRate: match.price };
        }
      }

      // Fallback to legacy RoomPricing (capacity + bathroom match)
      if (eventPricing.room_pricings) {
        const rp = eventPricing.room_pricings.find(
          (p) => p.capacity === data.room!.capacity && p.has_private_bathroom === data.room!.has_private_bathroom
        );
        if (rp) {
          return { price: rp.price, dailyRate: rp.daily_rate ?? null };
        }
      }

      // Fallback: try room type base_price from legacy room_pricings
      return { price: null, dailyRate: null };
    }
    return { price: eventPricing.event_price, dailyRate: null };
  })();
  const resolvedPrice = resolvedPricing.price;

  useEffect(() => {
    setLoading(true);
    setConfirmDiscard(false);
    getEventPersonDetail(eventPersonId).then((raw) => {
      const result = normalizeDetail(raw);
      setData(result);
      setEmailLocal(result.person.contact_email ?? "");
      setPhoneLocal(result.person.contact_phone ?? "");
      setAddressLocal(result.person.contact_address ?? "");
      setAllergiesLocal(result.person.allergies_text ?? "");
      setRequestsLocal(result.requests_text ?? "");
      setAmountPaidLocal(result.amount_paid != null ? String(result.amount_paid) : "");
      setPaymentNoteLocal(result.payment_note ?? "");
      const evStart = eventPricing?.event_dates?.start?.slice(0, 10) ?? "";
      const evEnd = eventPricing?.event_dates?.end?.slice(0, 10) ?? "";
      setDateArrivalLocal(result.date_arrival ? result.date_arrival.slice(0, 10) : evStart);
      setDateDepartureLocal(result.date_departure ? result.date_departure.slice(0, 10) : evEnd);
      setDiscountBreakfastLocal(String(result.discount_breakfast ?? 0));
      setDiscountLunchLocal(String(result.discount_lunch ?? 0));
      setDiscountDinnerLocal(String(result.discount_dinner ?? 0));
      setLoading(false);
    });
  }, [eventPersonId, refreshKey]);

  const saveField = useCallback(
    async (changes: Record<string, unknown>) => {
      await updateEventPerson(eventPersonId, eventId, changes);
      onPersonUpdated(eventPersonId, changes as PersonUpdateData);
    },
    [eventPersonId, eventId, onPersonUpdated]
  );

  const handleRoleChange = useCallback(
    (role: string) => {
      if (!data || data.role === role) return;
      setData((prev) => (prev ? { ...prev, role } : prev));
      saveField({ role });
    },
    [data, saveField]
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!data || data.status === status) return;
      setData((prev) => (prev ? { ...prev, status } : prev));

      // Auto-fill amount_paid based on status change
      const changes: Record<string, unknown> = { status };
      if (status === "reservado" && eventPricing?.deposit_amount != null) {
        changes.amount_paid = Number(eventPricing.deposit_amount);
        setAmountPaidLocal(String(eventPricing.deposit_amount));
        setData((prev) => prev ? { ...prev, amount_paid: Number(eventPricing.deposit_amount) } : prev);
      } else if (status === "pagado" && resolvedPrice != null) {
        // Use amount_owed (price - discounts) for auto-fill
        const disc = computeDiscount({
          eventDates: eventPricing?.event_dates,
          dateArrival: data?.date_arrival ?? null,
          dateDeparture: data?.date_departure ?? null,
          dailyRate: resolvedPricing.dailyRate ?? null,
          facilitationCostDay: eventPricing?.pricing_mode === "breakdown" ? eventPricing?.facilitation_cost_day : null,
          managementCostDay: eventPricing?.pricing_mode === "breakdown" ? eventPricing?.management_cost_day : null,
          discountBreakfast: data?.discount_breakfast ?? 0,
          discountLunch: data?.discount_lunch ?? 0,
          discountDinner: data?.discount_dinner ?? 0,
          mealCosts: eventPricing?.meal_costs,
        });
        const amountOwed = Math.max(0, resolvedPrice - disc.total);
        changes.amount_paid = amountOwed;
        setAmountPaidLocal(String(amountOwed));
        setData((prev) => prev ? { ...prev, amount_paid: amountOwed } : prev);
      } else if (status === "inscrito" || status === "confirmado_sin_pago") {
        changes.amount_paid = null;
        setAmountPaidLocal("");
        setData((prev) => prev ? { ...prev, amount_paid: null } : prev);
      }
      // cancelado: leave amount_paid as-is

      saveField(changes);
    },
    [data, saveField, eventPricing]
  );

  const handleGenderChange = useCallback(
    (gender: string) => {
      if (!data || data.person.gender === gender) return;
      setData((prev) =>
        prev ? { ...prev, person: { ...prev.person, gender } } : prev
      );
      saveField({ gender });
    },
    [data, saveField]
  );

  const handleDietaryToggle = useCallback(
    (value: string) => {
      if (!data) return;
      const current = data.person.dietary_requirements;
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setData((prev) =>
        prev ? { ...prev, person: { ...prev.person, dietary_requirements: updated } } : prev
      );
      saveField({ dietary_requirements: updated });
    },
    [data, saveField]
  );

  const handleDietaryNotified = useCallback(
    (val: boolean) => {
      setData((prev) =>
        prev ? { ...prev, dietary_notified: val } : prev
      );
      saveField({ dietary_notified: val });
    },
    [saveField]
  );

  const handleRequestsManaged = useCallback(
    (val: boolean) => {
      setData((prev) =>
        prev ? { ...prev, requests_managed: val } : prev
      );
      saveField({ requests_managed: val });
    },
    [saveField]
  );

  const handleEmailBlur = useCallback(() => {
    if (!data) return;
    const newVal = emailLocal || null;
    if (newVal === data.person.contact_email) return;
    setData((prev) => prev ? { ...prev, person: { ...prev.person, contact_email: newVal } } : prev);
    saveField({ contact_email: newVal });
  }, [data, emailLocal, saveField]);

  const handlePhoneBlur = useCallback(() => {
    if (!data) return;
    const newVal = phoneLocal || null;
    if (newVal === data.person.contact_phone) return;
    setData((prev) => prev ? { ...prev, person: { ...prev.person, contact_phone: newVal } } : prev);
    saveField({ contact_phone: newVal });
  }, [data, phoneLocal, saveField]);

  const handleAddressBlur = useCallback(() => {
    if (!data) return;
    const newVal = addressLocal || null;
    if (newVal === data.person.contact_address) return;
    setData((prev) => prev ? { ...prev, person: { ...prev.person, contact_address: newVal } } : prev);
    saveField({ contact_address: newVal });
  }, [data, addressLocal, saveField]);

  const handleAllergiesBlur = useCallback(() => {
    if (!data) return;
    const newVal = allergiesLocal || null;
    if (newVal === data.person.allergies_text) return;
    setData((prev) => (prev ? { ...prev, person: { ...prev.person, allergies_text: newVal } } : prev));
    saveField({ allergies_text: newVal });
  }, [data, allergiesLocal, saveField]);

  const handleRequestsBlur = useCallback(() => {
    if (!data) return;
    const newVal = requestsLocal || null;
    if (newVal === data.requests_text) return;
    setData((prev) => (prev ? { ...prev, requests_text: newVal } : prev));
    saveField({ requests_text: newVal });
  }, [data, requestsLocal, saveField]);

  const handleAmountPaidBlur = useCallback(() => {
    if (!data) return;
    const newVal = amountPaidLocal ? parseFloat(amountPaidLocal) : null;
    const current = data.amount_paid != null ? Number(data.amount_paid) : null;
    if (newVal === current) return;
    setData((prev) => (prev ? { ...prev, amount_paid: newVal } : prev));
    saveField({ amount_paid: newVal });
  }, [data, amountPaidLocal, saveField]);

  const handlePaymentNoteBlur = useCallback(() => {
    if (!data) return;
    const newVal = paymentNoteLocal || null;
    if (newVal === data.payment_note) return;
    setData((prev) => (prev ? { ...prev, payment_note: newVal } : prev));
    saveField({ payment_note: newVal });
  }, [data, paymentNoteLocal, saveField]);

  // Helper: compute days between two date strings
  const daysBetween = useCallback((a: string, b: string) => {
    return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)));
  }, []);

  // Auto-adjust meal discounts when stay changes by delta days
  const adjustMealDiscounts = useCallback((oldDays: number, newDays: number) => {
    if (!data || oldDays === newDays) return;
    const mc = eventPricing?.meal_costs;
    const delta = oldDays - newDays; // positive = stay shortened
    const updates: Record<string, number> = {};

    if (mc?.breakfast != null) {
      const v = Math.min(Math.max(0, data.discount_breakfast + delta), newDays);
      updates.discount_breakfast = v;
      setDiscountBreakfastLocal(String(v));
    }
    if (mc?.lunch != null) {
      const v = Math.min(Math.max(0, data.discount_lunch + delta), newDays);
      updates.discount_lunch = v;
      setDiscountLunchLocal(String(v));
    }
    if (mc?.dinner != null) {
      const v = Math.min(Math.max(0, data.discount_dinner + delta), newDays);
      updates.discount_dinner = v;
      setDiscountDinnerLocal(String(v));
    }

    if (Object.keys(updates).length > 0) {
      setData((prev) => prev ? { ...prev, ...updates } : prev);
      saveField(updates);
    }
  }, [data, eventPricing, saveField]);

  const handleDateArrivalBlur = useCallback(() => {
    if (!data) return;
    const evStart = eventPricing?.event_dates?.start?.slice(0, 10) ?? "";
    const evEnd = eventPricing?.event_dates?.end?.slice(0, 10) ?? "";
    // If empty or matches event start → treat as default (null in DB)
    let displayVal = dateArrivalLocal || evStart;
    let dbVal: string | null = displayVal === evStart ? null : displayVal;

    // Enforce: departure must be >= arrival + 1 day
    let effectiveDep = dateDepartureLocal || evEnd;
    if (displayVal && effectiveDep) {
      const arrDate = new Date(displayVal);
      const depDate = new Date(effectiveDep);
      if (depDate.getTime() - arrDate.getTime() < 1000 * 60 * 60 * 24) {
        const minDep = new Date(arrDate);
        minDep.setDate(minDep.getDate() + 1);
        const minDepStr = minDep.toISOString().slice(0, 10);
        setDateDepartureLocal(minDepStr);
        effectiveDep = minDepStr;
        const depDbVal = minDepStr === evEnd ? null : minDepStr;
        setData((prev) => prev ? { ...prev, date_departure: depDbVal } : prev);
        saveField({ date_departure: depDbVal });
      }
    }

    // Auto-adjust meal discounts
    const oldArr = data.date_arrival?.slice(0, 10) || evStart;
    const oldDep = data.date_departure?.slice(0, 10) || evEnd;
    const oldDays = daysBetween(oldArr, oldDep);
    const newDays = daysBetween(displayVal, effectiveDep);
    adjustMealDiscounts(oldDays, newDays);

    setDateArrivalLocal(displayVal);
    const current = data.date_arrival ? data.date_arrival.slice(0, 10) : null;
    if (dbVal === current) return;
    setData((prev) => prev ? { ...prev, date_arrival: dbVal } : prev);
    saveField({ date_arrival: dbVal });
  }, [data, dateArrivalLocal, dateDepartureLocal, eventPricing, saveField, daysBetween, adjustMealDiscounts]);

  const handleDateDepartureBlur = useCallback(() => {
    if (!data) return;
    const evStart = eventPricing?.event_dates?.start?.slice(0, 10) ?? "";
    const evEnd = eventPricing?.event_dates?.end?.slice(0, 10) ?? "";
    const effectiveArr = dateArrivalLocal || evStart;
    let displayVal = dateDepartureLocal || evEnd;

    // Enforce: departure must be >= arrival + 1 day (min 1 night)
    if (displayVal && effectiveArr) {
      const arrDate = new Date(effectiveArr);
      const depDate = new Date(displayVal);
      if (depDate.getTime() - arrDate.getTime() < 1000 * 60 * 60 * 24) {
        const minDep = new Date(arrDate);
        minDep.setDate(minDep.getDate() + 1);
        displayVal = minDep.toISOString().slice(0, 10);
      }
    }

    // Auto-adjust meal discounts
    const oldArr = data.date_arrival?.slice(0, 10) || evStart;
    const oldDep = data.date_departure?.slice(0, 10) || evEnd;
    const oldDays = daysBetween(oldArr, oldDep);
    const newDays = daysBetween(effectiveArr, displayVal);
    adjustMealDiscounts(oldDays, newDays);

    setDateDepartureLocal(displayVal);
    // If matches event end → null in DB
    const dbVal: string | null = displayVal === evEnd ? null : displayVal;
    const current = data.date_departure ? data.date_departure.slice(0, 10) : null;
    if (dbVal === current) return;
    setData((prev) => prev ? { ...prev, date_departure: dbVal } : prev);
    saveField({ date_departure: dbVal });
  }, [data, dateDepartureLocal, dateArrivalLocal, eventPricing, saveField, daysBetween, adjustMealDiscounts]);

  const personStayDays = useMemo(() => {
    const evS = eventPricing?.event_dates?.start?.slice(0, 10) ?? "";
    const evE = eventPricing?.event_dates?.end?.slice(0, 10) ?? "";
    const arr = dateArrivalLocal || evS;
    const dep = dateDepartureLocal || evE;
    if (!arr || !dep) return 999;
    return Math.max(0, Math.round((new Date(dep).getTime() - new Date(arr).getTime()) / (1000 * 60 * 60 * 24)));
  }, [dateArrivalLocal, dateDepartureLocal, eventPricing]);

  const handleDiscountBreakfastBlur = useCallback(() => {
    if (!data) return;
    const newVal = Math.min(Math.max(0, parseInt(discountBreakfastLocal) || 0), personStayDays);
    setDiscountBreakfastLocal(String(newVal));
    if (newVal === data.discount_breakfast) return;
    setData((prev) => prev ? { ...prev, discount_breakfast: newVal } : prev);
    saveField({ discount_breakfast: newVal });
  }, [data, discountBreakfastLocal, personStayDays, saveField]);

  const handleDiscountLunchBlur = useCallback(() => {
    if (!data) return;
    const newVal = Math.min(Math.max(0, parseInt(discountLunchLocal) || 0), personStayDays);
    setDiscountLunchLocal(String(newVal));
    if (newVal === data.discount_lunch) return;
    setData((prev) => prev ? { ...prev, discount_lunch: newVal } : prev);
    saveField({ discount_lunch: newVal });
  }, [data, discountLunchLocal, personStayDays, saveField]);

  const handleDiscountDinnerBlur = useCallback(() => {
    if (!data) return;
    const newVal = Math.min(Math.max(0, parseInt(discountDinnerLocal) || 0), personStayDays);
    setDiscountDinnerLocal(String(newVal));
    if (newVal === data.discount_dinner) return;
    setData((prev) => prev ? { ...prev, discount_dinner: newVal } : prev);
    saveField({ discount_dinner: newVal });
  }, [data, discountDinnerLocal, personStayDays, saveField]);

  const handleDiscard = useCallback(async () => {
    await removeEventPerson(eventPersonId, eventId);
    onPersonRemoved(eventPersonId);
  }, [eventPersonId, eventId, onPersonRemoved]);

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      // Optimistic: remove chip immediately
      setData((prev) => {
        if (!prev?.group) return prev;
        const filtered = prev.group.members.filter((m) => m.id !== memberId);
        if (filtered.length <= 1) return { ...prev, group: null };
        return { ...prev, group: { ...prev.group, members: filtered } };
      });
      try {
        await removeMemberFromGroup(memberId, eventId);
        const updated = await getEventPersonDetail(eventPersonId);
        setData(normalizeDetail(updated));
      } catch {
        // Revert on error by refetching
        const updated = await getEventPersonDetail(eventPersonId);
        setData(normalizeDetail(updated));
      }
    },
    [eventPersonId, eventId]
  );

  const handleToggleInseparable = useCallback(
    async (partnerId: string) => {
      // Optimistic: toggle inseparable immediately
      setData((prev) => {
        if (!prev) return prev;
        const newInseparable = prev.companion_id === partnerId ? null : partnerId;
        return { ...prev, companion_id: newInseparable };
      });
      try {
        await toggleInseparable(eventPersonId, partnerId, eventId);
        const updated = await getEventPersonDetail(eventPersonId);
        setData(normalizeDetail(updated));
        onBoardRefresh?.();
      } catch {
        // Revert on error by refetching
        const updated = await getEventPersonDetail(eventPersonId);
        setData(normalizeDetail(updated));
      }
    },
    [eventPersonId, eventId, onBoardRefresh]
  );

  if (loading) {
    return (
      <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </aside>
    );
  }

  if (!data) return null;

  const otherMembers = (() => {
    const members = data.group
      ? data.group.members.filter((m) => m.id !== data.id)
      : [];
    // Inject optimistic relation if not already present
    if (optimisticRelation && !members.some((m) => m.id === optimisticRelation.id)) {
      members.push({
        id: optimisticRelation.id,
        companion_id: null,
        person: { name_display: optimisticRelation.name_display },
      });
    }
    return members;
  })();

  // Compute summaries
  const roleSummary = ROLE_OPTIONS.find((o) => o.value === data.role)?.label ?? "";
  const statusSummary = STATUS_OPTIONS.find((o) => o.value === data.status)?.label ?? "";
  const genderSummary = GENDER_OPTIONS.find((o) => o.value === data.person.gender)?.label ?? "ND";
  const hasContact = data.person.contact_email || data.person.contact_phone || data.person.contact_address;
  const contactSummary = hasContact ? "Si" : "No";
  const inseparablePartner = otherMembers.find((m) => m.id === data.companion_id);
  const relationsSummary = inseparablePartner
    ? inseparablePartner.person.name_display
    : otherMembers.length > 0
      ? "Si"
      : "No";
  const activeDiets = DIETARY_OPTIONS.filter((o) => data.person.dietary_requirements.includes(o.value)).map((o) => o.label);
  const dietSummary = activeDiets.length > 0 ? activeDiets.join(", ") : "No";
  const allergiesSummary = data.person.allergies_text ? "Si" : "No";
  const preferencesSummary = data.requests_text ? "Si" : "No";

  const dietaryTrailing = (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="text-[10px] text-gray-400">Gestionado</span>
      <ToggleSwitch checked={data.dietary_notified} onChange={handleDietaryNotified} />
    </div>
  );

  const preferencesTrailing = (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="text-[10px] text-gray-400">Gestionado</span>
      <ToggleSwitch checked={data.requests_managed} onChange={handleRequestsManaged} />
    </div>
  );

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-gray-100 p-4">
        {data.person.avatar_url ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <Image
              src={data.person.avatar_url}
              alt={data.person.name_display}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {data.person.name_initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-800">
            {data.person.name_full}
          </h3>
          <p className="text-xs text-gray-400">
            {data.role === "facilitator" ? "Facilitador/a" : "Participante"}
            {data.room ? (
              <span className="ml-1">
                &middot; {data.room.display_name || `Hab ${data.room.internal_number}`}
              </span>
            ) : (
              <span className="ml-1">&middot; Sin asignar</span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="flex-1 divide-y divide-gray-100 px-4">
        {/* Role toggle */}
        <CollapsibleSection label="Rol" summary={roleSummary} open={openSections.has("Rol")} onToggle={() => toggleSection("Rol")}>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleRoleChange(opt.value)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  data.role === opt.value
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* Status */}
        <CollapsibleSection label="Estado" summary={statusSummary} open={openSections.has("Estado")} onToggle={() => toggleSection("Estado")}>
          <select
            value={data.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </CollapsibleSection>

        {/* Relations — auto-open during drag so droppable is mounted */}
        <CollapsibleSection label="Relaciones" summary={relationsSummary} open={openSections.has("Relaciones")} onToggle={() => toggleSection("Relaciones")} forceOpen={relationsIsOver || isDragActive}>
          <RelationsDropZone
            eventPersonId={data.id}
            inseparableWithId={data.companion_id}
            otherMembers={otherMembers}
            onRemoveMember={handleRemoveMember}
            onToggleInseparable={handleToggleInseparable}
            onPersonClick={onPersonClick}
            onIsOverChange={setRelationsIsOver}
          />
        </CollapsibleSection>

        {/* Payment — only when event has pricing */}
        {hasPricing && (() => {
          const ep = resolvedPrice;
          const paid = data.amount_paid != null ? Number(data.amount_paid) : 0;
          const noRoomYet = eventPricing?.pricing_by_room_type && !data.room;

          // Compute discounts
          const disc = computeDiscount({
            eventDates: eventPricing?.event_dates,
            dateArrival: data.date_arrival,
            dateDeparture: data.date_departure,
            dailyRate: resolvedPricing.dailyRate ?? null,
            facilitationCostDay: eventPricing?.pricing_mode === "breakdown" ? eventPricing?.facilitation_cost_day : null,
            managementCostDay: eventPricing?.pricing_mode === "breakdown" ? eventPricing?.management_cost_day : null,
            discountBreakfast: data.discount_breakfast,
            discountLunch: data.discount_lunch,
            discountDinner: data.discount_dinner,
            mealCosts: eventPricing?.meal_costs,
          });
          const amountOwed = ep != null ? Math.max(0, ep - disc.total) : null;
          const pending = amountOwed != null ? Math.max(0, amountOwed - paid) : null;
          const hasDiscountConfig = (resolvedPricing.dailyRate != null) || (eventPricing?.meal_costs?.breakfast != null) || (eventPricing?.meal_costs?.lunch != null) || (eventPricing?.meal_costs?.dinner != null);
          const hasActiveDiscount = disc.total > 0;

          const displayPrice = amountOwed ?? ep;
          const paidColor = displayPrice != null && paid >= displayPrice ? "text-success" : paid > 0 ? "text-warning" : "text-gray-400";
          const paySummary = noRoomYet ? "Sin habitación" : displayPrice != null ? `${paid} / ${displayPrice} €` : paid > 0 ? `${paid} €` : "—";

          return (
            <CollapsibleSection label="Pago" summary={paySummary} open={openSections.has("Pago")} onToggle={() => toggleSection("Pago")}>
              <div className="space-y-2">
                {/* Price label */}
                {ep != null && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Precio total alojamiento:</span>
                    <span className="font-medium text-gray-700">{ep.toFixed(2)} €</span>
                  </div>
                )}

                {/* Discount section */}
                {hasDiscountConfig && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Descuentos</p>

                    {/* Date arrival/departure — only if event has 2+ nights and daily_rate configured */}
                    {resolvedPricing.dailyRate != null && eventPricing?.event_dates && (() => {
                      const evStart = eventPricing.event_dates.start.slice(0, 10);
                      const evEnd = eventPricing.event_dates.end.slice(0, 10);
                      const eventNights = Math.round((new Date(evEnd).getTime() - new Date(evStart).getTime()) / (1000 * 60 * 60 * 24));
                      if (eventNights < 2) return null;

                      // Effective arrival for computing departure min
                      const effectiveArrival = dateArrivalLocal || evStart;
                      const arrivalPlusOne = new Date(effectiveArrival);
                      arrivalPlusOne.setDate(arrivalPlusOne.getDate() + 1);
                      const depMin = arrivalPlusOne.toISOString().slice(0, 10);

                      // Arrival max = event end - 1 (must leave room for at least 1 night)
                      const arrMaxDate = new Date(evEnd);
                      arrMaxDate.setDate(arrMaxDate.getDate() - 1);
                      const arrMax = arrMaxDate.toISOString().slice(0, 10);

                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 w-12">Llegada</span>
                            <input
                              type="date"
                              value={dateArrivalLocal}
                              placeholder={evStart}
                              onChange={(e) => setDateArrivalLocal(e.target.value)}
                              onBlur={handleDateArrivalBlur}
                              min={evStart}
                              max={arrMax}
                              className="flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs outline-none focus:border-primary"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 w-12">Salida</span>
                            <input
                              type="date"
                              value={dateDepartureLocal}
                              placeholder={evEnd}
                              onChange={(e) => setDateDepartureLocal(e.target.value)}
                              onBlur={handleDateDepartureBlur}
                              min={depMin}
                              max={evEnd}
                              className="flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs outline-none focus:border-primary"
                            />
                          </div>
                          {disc.daysLess > 0 && (
                            <p className="text-[10px] text-primary">
                              {disc.daysLess} día{disc.daysLess > 1 ? "s" : ""} menos × {(disc.dayDiscount / disc.daysLess).toFixed(2)}€/día = -{disc.dayDiscount.toFixed(2)}€
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Meal discounts — max = person's stay days (departure - arrival) */}
                    {(() => {
                      const evS = eventPricing?.event_dates?.start?.slice(0, 10) ?? "";
                      const evE = eventPricing?.event_dates?.end?.slice(0, 10) ?? "";
                      const arr = dateArrivalLocal || evS;
                      const dep = dateDepartureLocal || evE;
                      const maxMeals = arr && dep ? Math.max(0, Math.round((new Date(dep).getTime() - new Date(arr).getTime()) / (1000 * 60 * 60 * 24))) : 999;

                      return (
                        <>
                          {eventPricing?.meal_costs?.breakfast != null && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 flex-1">Desayunos ×{eventPricing.meal_costs.breakfast}€</span>
                              <input
                                type="number"
                                min={0}
                                max={maxMeals}
                                value={discountBreakfastLocal}
                                onChange={(e) => setDiscountBreakfastLocal(e.target.value)}
                                onBlur={handleDiscountBreakfastBlur}
                                className="w-12 rounded border border-gray-200 bg-white px-1 py-0.5 text-xs text-center outline-none focus:border-primary"
                              />
                              {(parseInt(discountBreakfastLocal) || 0) > 0 && (
                                <span className="text-[10px] text-primary">-{((parseInt(discountBreakfastLocal) || 0) * eventPricing.meal_costs.breakfast).toFixed(2)}€</span>
                              )}
                            </div>
                          )}
                          {eventPricing?.meal_costs?.lunch != null && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 flex-1">Comidas ×{eventPricing.meal_costs.lunch}€</span>
                              <input
                                type="number"
                                min={0}
                                max={maxMeals}
                                value={discountLunchLocal}
                                onChange={(e) => setDiscountLunchLocal(e.target.value)}
                                onBlur={handleDiscountLunchBlur}
                                className="w-12 rounded border border-gray-200 bg-white px-1 py-0.5 text-xs text-center outline-none focus:border-primary"
                              />
                              {(parseInt(discountLunchLocal) || 0) > 0 && (
                                <span className="text-[10px] text-primary">-{((parseInt(discountLunchLocal) || 0) * eventPricing.meal_costs.lunch).toFixed(2)}€</span>
                              )}
                            </div>
                          )}
                          {eventPricing?.meal_costs?.dinner != null && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 flex-1">Cenas ×{eventPricing.meal_costs.dinner}€</span>
                              <input
                                type="number"
                                min={0}
                                max={maxMeals}
                                value={discountDinnerLocal}
                                onChange={(e) => setDiscountDinnerLocal(e.target.value)}
                                onBlur={handleDiscountDinnerBlur}
                                className="w-12 rounded border border-gray-200 bg-white px-1 py-0.5 text-xs text-center outline-none focus:border-primary"
                              />
                              {(parseInt(discountDinnerLocal) || 0) > 0 && (
                                <span className="text-[10px] text-primary">-{((parseInt(discountDinnerLocal) || 0) * eventPricing.meal_costs.dinner).toFixed(2)}€</span>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {hasActiveDiscount && (
                      <div className="flex items-center justify-between border-t border-gray-200 pt-1 text-xs">
                        <span className="text-gray-500">Total descuento:</span>
                        <span className="font-medium text-primary">-{disc.total.toFixed(2)} €</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Adjusted price */}
                {hasActiveDiscount && amountOwed != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Precio ajustado:</span>
                    <span className="font-semibold text-gray-800">{amountOwed.toFixed(2)} €</span>
                  </div>
                )}

                {/* Progress bar */}
                {displayPrice != null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", paid >= displayPrice ? "bg-success" : paid > 0 ? "bg-warning" : "bg-gray-200")}
                        style={{ width: `${Math.min(100, displayPrice > 0 ? (paid / displayPrice) * 100 : 0)}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-medium whitespace-nowrap", paidColor)}>{paid} / {displayPrice} €</span>
                  </div>
                )}

                {/* Amount paid input */}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-gray-400">payments</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountPaidLocal}
                    onChange={(e) => setAmountPaidLocal(e.target.value)}
                    onBlur={handleAmountPaidBlur}
                    placeholder="Importe pagado"
                    className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                </div>

                {/* Pending display */}
                {pending != null && pending > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Pendiente:</span>
                    <span className="font-medium text-danger">{pending.toFixed(2)} €</span>
                  </div>
                )}

                {/* Payment note */}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-gray-400">note</span>
                  <input
                    value={paymentNoteLocal}
                    onChange={(e) => setPaymentNoteLocal(e.target.value)}
                    onBlur={handlePaymentNoteBlur}
                    placeholder="Nota de pago (Bizum, transferencia...)"
                    className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
            </CollapsibleSection>
          );
        })()}

        {/* Gender */}
        <CollapsibleSection label="Genero" summary={genderSummary} open={openSections.has("Genero")} onToggle={() => toggleSection("Genero")}>
          <div className="flex gap-1">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGenderChange(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  data.person.gender === opt.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-500 hover:text-gray-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* Contact */}
        <CollapsibleSection label="Contacto" summary={contactSummary} open={openSections.has("Contacto")} onToggle={() => toggleSection("Contacto")}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-gray-400">mail</span>
              <input
                type="email"
                value={emailLocal}
                onChange={(e) => setEmailLocal(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="Email"
                className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-gray-400">phone</span>
              <input
                type="tel"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder="Telefono"
                className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-gray-400">location_on</span>
              <input
                value={addressLocal}
                onChange={(e) => setAddressLocal(e.target.value)}
                onBlur={handleAddressBlur}
                placeholder="Direccion"
                className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Dietary */}
        <CollapsibleSection label="Dieta" summary={dietSummary} open={openSections.has("Dieta")} onToggle={() => toggleSection("Dieta")} trailing={dietaryTrailing}>
          <div className="flex items-center gap-1">
            {DIETARY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleDietaryToggle(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  data.person.dietary_requirements.includes(opt.value)
                    ? "bg-warning/20 text-warning"
                    : "bg-gray-100 text-gray-500 hover:text-gray-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* Allergies */}
        <CollapsibleSection label="Alergias" summary={allergiesSummary} open={openSections.has("Alergias")} onToggle={() => toggleSection("Alergias")}>
          <textarea
            value={allergiesLocal}
            onChange={(e) => setAllergiesLocal(e.target.value)}
            onBlur={handleAllergiesBlur}
            placeholder="Ninguna conocida"
            rows={2}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm outline-none",
              allergiesLocal
                ? "border-red-200 bg-red-50/50 focus:border-red-300"
                : "border-gray-200 focus:border-primary"
            )}
          />
        </CollapsibleSection>

        {/* Preferences / Requests */}
        <CollapsibleSection label="Preferencias" summary={preferencesSummary} open={openSections.has("Preferencias")} onToggle={() => toggleSection("Preferencias")} trailing={preferencesTrailing}>
          <textarea
            value={requestsLocal}
            onChange={(e) => setRequestsLocal(e.target.value)}
            onBlur={handleRequestsBlur}
            placeholder="Sin preferencias"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </CollapsibleSection>
      </div>

      {/* Footer — Discard */}
      <div className="border-t border-gray-100 p-4">
        {confirmDiscard ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Se eliminara a esta persona del evento. Esta accion no se puede
              deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90"
              >
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDiscard(true)}
            className="w-full rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5"
          >
            Descartar Participante
          </button>
        )}
      </div>
    </aside>
  );
}

function RelationsDropZone({
  eventPersonId,
  inseparableWithId,
  otherMembers,
  onRemoveMember,
  onToggleInseparable,
  onPersonClick,
  onIsOverChange,
}: {
  eventPersonId: string;
  inseparableWithId: string | null;
  otherMembers: GroupMember[];
  onRemoveMember: (memberId: string) => void;
  onToggleInseparable: (partnerId: string) => void;
  onPersonClick?: (id: string) => void;
  onIsOverChange?: (isOver: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `relations-${eventPersonId}`,
  });

  const prevIsOver = useRef(isOver);
  useEffect(() => {
    if (prevIsOver.current !== isOver) {
      prevIsOver.current = isOver;
      onIsOverChange?.(isOver);
    }
  }, [isOver, onIsOverChange]);

  // Sort: inseparable first, then alphabetical
  const sorted = [...otherMembers].sort((a, b) => {
    if (a.id === inseparableWithId) return -1;
    if (b.id === inseparableWithId) return 1;
    return a.person.name_display.localeCompare(b.person.name_display);
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[40px] rounded-lg border border-dashed p-2 transition-colors",
        isOver
          ? "border-primary bg-primary/5"
          : otherMembers.length > 0
            ? "border-gray-200 bg-gray-50/50"
            : "border-gray-300"
      )}
    >
      {otherMembers.length === 0 ? (
        <p className={cn(
          "text-center text-xs py-1",
          isOver ? "text-primary" : "text-gray-400"
        )}>
          {isOver ? "Soltar para relacionar" : "Arrastra una persona aqui"}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {sorted.map((m) => {
              const isInseparable = inseparableWithId === m.id;
              return (
                <span
                  key={m.id}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors",
                    isInseparable
                      ? "bg-primary text-white"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <button
                    onClick={() => onToggleInseparable(m.id)}
                    className={cn(
                      "flex items-center gap-1",
                      isInseparable ? "text-white" : "text-primary hover:text-primary/80"
                    )}
                    title={isInseparable ? "Quitar acompañante" : "Marcar como acompañante"}
                  >
                    <span className={cn(
                      "material-symbols-outlined text-sm",
                      isInseparable ? "opacity-100" : "opacity-0"
                    )}>link</span>
                    {m.person.name_display}
                  </button>
                  <button
                    onClick={() => onRemoveMember(m.id)}
                    className={cn(
                      "hover:opacity-100",
                      isInseparable ? "text-white/70 hover:text-white" : "text-primary/60 hover:text-primary"
                    )}
                    title="Quitar relacion"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          {isOver && (
            <p className="text-center text-xs text-primary">
              Soltar para relacionar
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  label,
  summary,
  children,
  trailing,
  open,
  onToggle,
  forceOpen,
}: {
  label: string;
  summary: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  forceOpen?: boolean;
}) {
  useEffect(() => {
    if (forceOpen && !open) onToggle();
  }, [forceOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="py-3">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        className="flex w-full cursor-pointer items-center gap-2"
      >
        <span className="material-symbols-outlined text-base text-gray-400 transition-transform" style={{ transform: open ? "rotate(90deg)" : undefined }}>
          chevron_right
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span className="flex-1" />
        <span className="truncate text-xs text-gray-500 max-w-[140px] text-right">
          {summary}
        </span>
        {trailing && <span className="ml-1 shrink-0" onClick={(e) => e.stopPropagation()}>{trailing}</span>}
      </div>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        checked ? "bg-success" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}
