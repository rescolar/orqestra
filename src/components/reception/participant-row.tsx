"use client";

import { useState, useTransition } from "react";
import type { ReceptionPerson } from "@/lib/services/reception.service";

type ParticipantRowProps = {
  participant: ReceptionPerson;
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
