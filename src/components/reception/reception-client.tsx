"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ReceptionPerson } from "@/lib/services/reception.service";
import { checkIn, undoCheckIn } from "@/lib/actions/reception";
import { ParticipantRow } from "./participant-row";

type Props = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  initialParticipants: ReceptionPerson[];
};

type Filter = "all" | "pending" | "arrived";

function generateCsv(participants: ReceptionPerson[], eventName: string) {
  const BOM = "\uFEFF";
  const headers = [
    "Nombre",
    "Rol",
    "Habitación",
    "Teléfono",
    "Email",
    "Género",
    "Estado",
    "Dieta",
    "Alergias",
    "Cena llegada",
    "Almuerzo final",
    "Solicitudes",
    "Check-in",
  ];

  const rows = participants.map((p) => [
    p.person.name_full,
    p.role === "facilitator" ? "Facilitador" : "Participante",
    p.room
      ? p.room.display_name || `Hab ${p.room.internal_number}`
      : "Sin habitación",
    p.person.contact_phone || "",
    p.person.contact_email || "",
    p.person.gender === "female"
      ? "Mujer"
      : p.person.gender === "male"
        ? "Hombre"
        : p.person.gender === "other"
          ? "Otro"
          : "No especificado",
    p.status === "confirmed"
      ? "Confirmado"
      : p.status === "tentative"
        ? "Tentativo"
        : p.status,
    p.person.dietary_requirements.join(", "),
    p.person.allergies_text || "",
    p.arrives_for_dinner ? "Sí" : "No",
    p.last_meal_lunch ? "Sí" : "No",
    p.requests_text || "",
    p.checked_in_at
      ? new Date(p.checked_in_at).toLocaleString("es-ES")
      : "No",
  ]);

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
}: Props) {
  const [participants, setParticipants] =
    useState<ReceptionPerson[]>(initialParticipants);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const checkedInCount = useMemo(
    () => participants.filter((p) => p.checked_in_at).length,
    [participants]
  );
  const noRoomCount = useMemo(
    () => participants.filter((p) => !p.room).length,
    [participants]
  );

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
          <Link
            href={`/events/${eventId}/board`}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Tablero
          </Link>
        </div>

        {/* KPIs */}
        <div className="mt-2 flex items-center gap-3 text-sm">
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
          <div className="flex-1" />
          <button
            onClick={() => generateCsv(participants, eventName)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            CSV
          </button>
          <Link
            href={`/events/${eventId}/reception/print`}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Descargas
          </Link>
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
              onCheckIn={handleCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
            />
          ))
        )}
      </div>
    </div>
  );
}
