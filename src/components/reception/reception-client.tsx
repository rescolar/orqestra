"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ReceptionPerson, ReceptionPricing } from "@/lib/services/reception.service";
import { checkIn, undoCheckIn } from "@/lib/actions/reception";
import { ParticipantRow } from "./participant-row";

export function resolvePrice(
  person: ReceptionPerson,
  pricing: ReceptionPricing
): number | null {
  if (pricing.pricingByRoomType) {
    if (!person.room) return null;
    const match = pricing.roomPricings.find(
      (rp) =>
        rp.capacity === person.room!.capacity &&
        rp.has_private_bathroom === person.room!.has_private_bathroom
    );
    return match?.price ?? null;
  }
  return pricing.eventPrice;
}

export function resolveDiscount(
  person: ReceptionPerson,
  pricing: ReceptionPricing
): number {
  let dayDiscount = 0;

  // Day discount (only for pricing_by_room_type with daily_rate)
  if (pricing.pricingByRoomType && person.room && pricing.eventDates) {
    const match = pricing.roomPricings.find(
      (rp) =>
        rp.capacity === person.room!.capacity &&
        rp.has_private_bathroom === person.room!.has_private_bathroom
    );
    const dailyRate = match?.daily_rate ?? null;
    if (dailyRate) {
      const eventStart = new Date(pricing.eventDates.start);
      const eventEnd = new Date(pricing.eventDates.end);
      const arrival = person.date_arrival ? new Date(person.date_arrival) : eventStart;
      const departure = person.date_departure ? new Date(person.date_departure) : eventEnd;
      const eventDays = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
      const personDays = Math.round((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
      dayDiscount = Math.max(0, eventDays - personDays) * dailyRate;
    }
  }

  // Meal discount
  const mc = pricing.mealCosts;
  const mealDiscount =
    (person.discount_breakfast * (mc?.breakfast ?? 0)) +
    (person.discount_lunch * (mc?.lunch ?? 0)) +
    (person.discount_dinner * (mc?.dinner ?? 0));

  return dayDiscount + mealDiscount;
}

export function resolveAmountOwed(
  person: ReceptionPerson,
  pricing: ReceptionPricing
): number | null {
  const price = resolvePrice(person, pricing);
  if (price == null) return null;
  const discount = resolveDiscount(person, pricing);
  return Math.max(0, price - discount);
}

type Props = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  initialParticipants: ReceptionPerson[];
  pricing: ReceptionPricing;
  variant?: "organizer" | "public";
};

type Filter = "all" | "pending" | "arrived";

function generateCsv(participants: ReceptionPerson[], eventName: string, pricing: ReceptionPricing) {
  const BOM = "\uFEFF";
  const hasPricing = pricing.eventPrice != null || pricing.pricingByRoomType;
  const headers = [
    "Nombre",
    "Rol",
    "Habitación",
    "Estado",
    ...(hasPricing ? ["Precio hab.", "Descuento", "Precio ajustado", "Reserva", "Pagado", "Pendiente"] : []),
    "Teléfono",
    "Email",
    "Dieta",
    "Alergias",
    "Check-in",
  ];

  const rows = participants.map((p) => {
    const price = resolvePrice(p, pricing);
    const discount = resolveDiscount(p, pricing);
    const owed = resolveAmountOwed(p, pricing);
    const paid = p.amount_paid ?? 0;
    const pending = owed != null ? Math.max(0, owed - paid) : null;

    return [
      p.person.name_full,
      p.role === "facilitator" ? "Facilitador" : "Participante",
      p.room
        ? p.room.display_name || `Hab ${p.room.internal_number}`
        : "Sin habitación",
      p.status === "inscrito" ? "Inscrito"
        : p.status === "reservado" ? "Reservado"
        : p.status === "pagado" ? "Pagado"
        : p.status === "confirmado_sin_pago" ? "Confirmado s/p"
        : p.status === "solicita_cancelacion" ? "Solicita cancelación"
        : p.status === "cancelado" ? "Cancelado"
        : p.status,
      ...(hasPricing
        ? [
            price != null ? `${price.toFixed(2)}` : "—",
            discount > 0 ? `${discount.toFixed(2)}` : "0.00",
            owed != null ? `${owed.toFixed(2)}` : "—",
            pricing.depositAmount != null ? `${pricing.depositAmount.toFixed(2)}` : "—",
            `${paid.toFixed(2)}`,
            pending != null ? `${pending.toFixed(2)}` : "—",
          ]
        : []),
      p.person.contact_phone || "",
      p.person.contact_email || "",
      p.person.dietary_requirements.join(", "),
      p.person.allergies_text || "",
      p.checked_in_at
        ? new Date(p.checked_in_at).toLocaleString("es-ES")
        : "No",
    ];
  });

  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csv =
    BOM +
    [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  const safeName = eventName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "").replace(/\s+/g, "-");
  a.href = url;
  a.download = `recepcion-${safeName}-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReceptionClient({
  eventId,
  eventName,
  dateStart,
  dateEnd,
  initialParticipants,
  pricing,
  variant = "organizer",
}: Props) {
  const isPublic = variant === "public";
  const [participants, setParticipants] =
    useState<ReceptionPerson[]>(initialParticipants);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const hasPricing = pricing.eventPrice != null || pricing.pricingByRoomType;

  const checkedInCount = useMemo(
    () => participants.filter((p) => p.checked_in_at).length,
    [participants]
  );
  const noRoomCount = useMemo(
    () => participants.filter((p) => !p.room).length,
    [participants]
  );

  const paymentStats = useMemo(() => {
    if (!hasPricing) return null;
    let totalExpected = 0;
    let totalPaid = 0;
    let depositPaid = 0;
    let fullyPaid = 0;
    let noPay = 0;

    for (const p of participants) {
      const owed = resolveAmountOwed(p, pricing);
      if (owed != null) totalExpected += owed;
      const paid = p.amount_paid ?? 0;
      totalPaid += paid;

      if (paid <= 0) {
        noPay++;
      } else if (owed != null && paid >= owed) {
        fullyPaid++;
      } else if (pricing.depositAmount != null && paid >= pricing.depositAmount) {
        depositPaid++;
      } else {
        // Partial payment that doesn't reach deposit
        noPay++;
      }
    }

    return { totalExpected, totalPaid, depositPaid, fullyPaid, noPay, pending: totalExpected - totalPaid };
  }, [participants, pricing, hasPricing]);

  const filtered = useMemo(() => {
    let list = participants;

    // Filter
    if (filter === "pending") {
      list = list.filter((p) => !p.checked_in_at);
    } else if (filter === "arrived") {
      list = list.filter((p) => p.checked_in_at);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.person.name_full.toLowerCase().includes(q) ||
          p.person.name_full.toLowerCase().includes(q) ||
          (p.room?.display_name?.toLowerCase().includes(q)) ||
          (p.room?.internal_number?.includes(q))
      );
    }

    // Sort: pending first, then arrived, alphabetical within each
    return [...list].sort((a, b) => {
      const aChecked = a.checked_in_at ? 1 : 0;
      const bChecked = b.checked_in_at ? 1 : 0;
      if (aChecked !== bChecked) return aChecked - bChecked;
      return a.person.name_full.localeCompare(b.person.name_full);
    });
  }, [participants, search, filter]);

  const handleCheckIn = async (id: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, checked_in_at: new Date() } : p
      )
    );
    await checkIn(id);
  };

  const handleUndoCheckIn = async (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, checked_in_at: null } : p))
    );
    await undoCheckIn(id);
  };

  const fmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  });
  const dateRange = `${fmt.format(new Date(dateStart))} — ${fmt.format(new Date(dateEnd))}`;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-primary">
              {eventName}
            </h1>
            <p className="text-xs text-gray-400">{dateRange}</p>
          </div>
          {!isPublic && (
            <Link
              href={`/events/${eventId}/board`}
              className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Tablero
            </Link>
          )}
        </div>

        {/* KPIs */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-primary">
            {checkedInCount}/{participants.length}{" "}
            <span className="font-normal text-gray-500">llegados</span>
          </span>
          {noRoomCount > 0 && (
            <span className="font-medium text-warning">
              {noRoomCount}{" "}
              <span className="font-normal">sin hab.</span>
            </span>
          )}
          {paymentStats && (
            <>
              <span className="text-gray-300">|</span>
              <span className="font-medium text-green-600">
                {paymentStats.fullyPaid}{" "}
                <span className="font-normal text-gray-500">pagados</span>
              </span>
              {paymentStats.depositPaid > 0 && (
                <span className="font-medium text-amber-600">
                  {paymentStats.depositPaid}{" "}
                  <span className="font-normal text-gray-500">reserva</span>
                </span>
              )}
              {paymentStats.noPay > 0 && (
                <span className="font-medium text-red-600">
                  {paymentStats.noPay}{" "}
                  <span className="font-normal text-gray-500">sin pago</span>
                </span>
              )}
            </>
          )}
          <div className="flex-1" />
          <button
            onClick={() => generateCsv(participants, eventName, pricing)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            CSV
          </button>
          {!isPublic && (
            <Link
              href={`/events/${eventId}/reception/print`}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Descargas
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar participante o habitación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter pills */}
        <div className="mt-2 flex gap-2">
          {(
            [
              ["all", "Todos"],
              ["pending", "Pendientes"],
              ["arrived", "Llegados"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
              {key === "pending" && (
                <span className="ml-1">
                  ({participants.length - checkedInCount})
                </span>
              )}
              {key === "arrived" && (
                <span className="ml-1">({checkedInCount})</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Payment summary bar */}
      {paymentStats && (
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2 text-xs">
          <span className="text-gray-500">
            Recaudado: <span className="font-semibold text-green-700">{paymentStats.totalPaid.toFixed(2)}€</span>
          </span>
          {paymentStats.pending > 0 && (
            <span className="text-gray-500">
              Pendiente: <span className="font-semibold text-red-600">{paymentStats.pending.toFixed(2)}€</span>
            </span>
          )}
          <span className="text-gray-500">
            Total: <span className="font-semibold text-gray-700">{paymentStats.totalExpected.toFixed(2)}€</span>
          </span>
        </div>
      )}

      {/* List */}
      <div>
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            {search
              ? "No se encontraron participantes"
              : "No hay participantes en esta categoría"}
          </div>
        ) : (
          filtered.map((p) => (
            <ParticipantRow
              key={p.id}
              participant={p}
              pricing={pricing}
              isPublic={isPublic}
              onCheckIn={handleCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
            />
          ))
        )}
      </div>
    </div>
  );
}
