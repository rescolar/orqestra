"use client";

import { useState, useTransition } from "react";
import type { ReceptionPerson, ReceptionPricing } from "@/lib/services/reception.service";
import { resolvePrice } from "./reception-client";

type ParticipantRowProps = {
  participant: ReceptionPerson;
  pricing: ReceptionPricing;
  isPublic?: boolean;
  onCheckIn: (id: string) => Promise<void>;
  onUndoCheckIn: (id: string) => Promise<void>;
};

function roomLabel(p: ReceptionPerson) {
  if (!p.room) return null;
  return p.room.display_name || `Hab ${p.room.internal_number}`;
}

function mealLabels(p: ReceptionPerson) {
  const meals: string[] = [];
  if (p.arrives_for_dinner) meals.push("Cena llegada");
  if (p.last_meal_lunch) meals.push("Almuerzo final");
  return meals;
}

export function ParticipantRow({
  participant: p,
  pricing,
  isPublic = false,
  onCheckIn,
  onUndoCheckIn,
}: ParticipantRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticCheckedIn, setOptimisticCheckedIn] = useState(
    !!p.checked_in_at
  );

  const checkedIn = optimisticCheckedIn;
  const hasDiet =
    p.person.dietary_requirements.length > 0 || !!p.person.allergies_text;
  const room = roomLabel(p);

  const hasPricing = pricing.eventPrice != null || pricing.pricingByRoomType;
  const price = resolvePrice(p, pricing);
  const paid = p.amount_paid ?? 0;
  const pending = price != null ? Math.max(0, price - paid) : null;
  const paymentStatus = !hasPricing
    ? null
    : price != null && paid >= price
      ? "paid"
      : pricing.depositAmount != null && paid >= pricing.depositAmount
        ? "deposit"
        : paid > 0
          ? "partial"
          : "none";

  const handleCheckToggle = () => {
    const newValue = !checkedIn;
    setOptimisticCheckedIn(newValue);
    startTransition(async () => {
      try {
        if (newValue) {
          await onCheckIn(p.id);
        } else {
          await onUndoCheckIn(p.id);
        }
      } catch {
        setOptimisticCheckedIn(!newValue);
      }
    });
  };

  return (
    <div
      className={`border-b border-gray-100 transition-colors ${
        checkedIn ? "bg-success/5" : ""
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        {isPublic ? (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 ${
              checkedIn
                ? "border-success bg-success text-white"
                : "border-gray-300 bg-white"
            }`}
          >
            {checkedIn && (
              <span className="material-symbols-outlined text-xl">check</span>
            )}
          </div>
        ) : (
          <button
            onClick={handleCheckToggle}
            disabled={isPending}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
              checkedIn
                ? "border-success bg-success text-white"
                : "border-gray-300 bg-white hover:border-primary/50"
            } ${isPending ? "opacity-50" : ""}`}
            aria-label={checkedIn ? "Desmarcar llegada" : "Marcar llegada"}
          >
            {checkedIn && (
              <span className="material-symbols-outlined text-xl">check</span>
            )}
          </button>
        )}

        {/* Info */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`truncate font-medium ${
                  checkedIn ? "text-gray-400 line-through" : "text-gray-900"
                }`}
              >
                {p.person.name_full}
              </span>
              {p.role === "facilitator" && (
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                  Facilitador
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-sm">
              {room ? (
                <span className="text-gray-500">{room}</span>
              ) : (
                <span className="text-warning font-medium">Sin habitación</span>
              )}
              {hasDiet && (
                <span className="material-symbols-outlined text-warning text-sm">
                  restaurant
                </span>
              )}
              {paymentStatus === "paid" && (
                <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                  Pagado
                </span>
              )}
              {paymentStatus === "deposit" && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Reserva
                </span>
              )}
              {paymentStatus === "partial" && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Parcial
                </span>
              )}
              {paymentStatus === "none" && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                  Sin pago
                </span>
              )}
            </div>
          </div>
          <span className="material-symbols-outlined shrink-0 text-gray-400 text-base">
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-2 px-4 pb-4 pl-[4.25rem] text-sm text-gray-600">
          <p className="text-gray-900">{p.person.name_full}</p>

          {p.person.contact_phone && (
            <p>
              <a
                href={`tel:${p.person.contact_phone}`}
                className="text-primary underline"
              >
                {p.person.contact_phone}
              </a>
            </p>
          )}

          {p.person.contact_email && (
            <p className="text-gray-500">{p.person.contact_email}</p>
          )}

          {hasPricing && (
            <div className="flex items-center gap-3">
              {price != null && (
                <span>
                  <span className="font-medium text-gray-700">Precio: </span>
                  {price.toFixed(2)}€
                </span>
              )}
              <span>
                <span className="font-medium text-gray-700">Pagado: </span>
                {paid.toFixed(2)}€
              </span>
              {pending != null && pending > 0 && (
                <span className="font-medium text-red-600">
                  Pendiente: {pending.toFixed(2)}€
                </span>
              )}
            </div>
          )}

          {p.person.dietary_requirements.length > 0 && (
            <p>
              <span className="font-medium text-gray-700">Dieta: </span>
              {p.person.dietary_requirements.join(", ")}
            </p>
          )}

          {p.person.allergies_text && (
            <p>
              <span className="font-medium text-danger">Alergias: </span>
              {p.person.allergies_text}
            </p>
          )}

          {p.requests_text && (
            <p>
              <span className="font-medium text-gray-700">Solicitudes: </span>
              {p.requests_text}
            </p>
          )}

          {mealLabels(p).length > 0 && (
            <p>
              <span className="font-medium text-gray-700">Comidas: </span>
              {mealLabels(p).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
