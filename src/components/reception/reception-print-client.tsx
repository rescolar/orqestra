"use client";

import Link from "next/link";
import type { ReceptionPerson, ReceptionRoom } from "@/lib/services/reception.service";

type Props = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  participants: ReceptionPerson[];
  rooms: ReceptionRoom[];
};

function roomLabel(p: ReceptionPerson) {
  if (!p.room) return "Sin habitación";
  return p.room.display_name || `Hab ${p.room.internal_number}`;
}

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

function roomDisplayName(r: ReceptionRoom) {
  return r.display_name || `Hab ${r.internal_number}`;
}

export function ReceptionPrintClient({
  eventId,
  eventName,
  dateStart,
  dateEnd,
  participants,
  rooms,
}: Props) {
  const sorted = [...participants].sort((a, b) =>
    a.person.name_full.localeCompare(b.person.name_full)
  );

  const fmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateRange = `${fmt.format(new Date(dateStart))} — ${fmt.format(new Date(dateEnd))}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Screen header (hidden on print) */}
      <header className="flex items-center justify-between border-b px-6 py-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href={`/events/${eventId}/reception`}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Recepción
          </Link>
          <div className="text-sm text-gray-500">
            {participants.length} participantes · {rooms.length} habitaciones
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateCsv(participants, eventName)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-base">
              download
            </span>
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir
          </button>
        </div>
      </header>

      <div className="p-6 print:p-0">
        {/* Section A — Room assignments (large, for participants to read) */}
        <section className="mb-12 print:mb-8">
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-primary print:text-black">
              {eventName}
            </h2>
            <p className="text-sm text-gray-500">{dateRange}</p>
            <h3 className="mt-2 text-lg font-semibold">
              Asignación de habitaciones
            </h3>
          </div>

          <div className="columns-2 gap-8 print:columns-2">
            <table className="w-full text-left text-[14pt] leading-relaxed">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="pb-1 font-semibold">Nombre</th>
                  <th className="pb-1 text-right font-semibold">Habitación</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-1">{p.person.name_full}</td>
                    <td className="py-1 text-right">{roomLabel(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Page break */}
        <div className="hidden print:block" style={{ breakBefore: "page" }} />

        {/* Section B — Control list (for organizer) */}
        <section className="mb-12 print:mb-8">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              Lista de control — {eventName}
            </h3>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="w-8 pb-1"></th>
                <th className="pb-1 font-semibold">Nombre</th>
                <th className="pb-1 font-semibold">Habitación</th>
                <th className="pb-1 font-semibold">Teléfono</th>
                <th className="pb-1 font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const notes = [
                  ...p.person.dietary_requirements,
                  p.person.allergies_text ? `Alergia: ${p.person.allergies_text}` : "",
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-1">
                      <div className="h-4 w-4 border border-gray-400" />
                    </td>
                    <td className="py-1">{p.person.name_full}</td>
                    <td className="py-1">{roomLabel(p)}</td>
                    <td className="py-1">{p.person.contact_phone || "—"}</td>
                    <td className="py-1 text-xs text-gray-600">{notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Page break */}
        <div className="hidden print:block" style={{ breakBefore: "page" }} />

        {/* Section C — Door cards */}
        <section>
          <h3 className="mb-4 text-lg font-semibold print:hidden">
            Tarjetas de puerta
          </h3>

          <div className="grid grid-cols-2 gap-4 print:gap-6">
            {rooms.filter((r) => !r.has_private_bathroom).map((room) => (
              <div
                key={room.id}
                className="rounded-xl border-2 border-gray-300 p-5"
                style={{ breakInside: "avoid" }}
              >
                <h4 className="mb-3 text-center text-xl font-bold uppercase tracking-wide">
                  {roomDisplayName(room)}
                </h4>
                <div className="mb-4 space-y-1 text-center">
                  {room.event_persons.map((ep) => (
                    <p key={ep.id} className="text-lg">
                      {ep.person.name_full}
                    </p>
                  ))}
                </div>
                <div className="flex justify-center gap-4 text-xs text-gray-500">
                  <span>Cap: {room.capacity}</span>
                  {room.has_private_bathroom && <span>Baño priv.</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
