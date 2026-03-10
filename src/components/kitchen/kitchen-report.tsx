"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMealAttendance, markAllDietaryNotified } from "@/lib/actions/kitchen";
import { KitchenShareButton } from "@/components/kitchen/kitchen-share-button";
import type { KitchenReportRow, KitchenEventDates } from "@/lib/services/kitchen.service";

interface KitchenReportClientProps {
  eventId: string;
  eventName: string;
  rows: KitchenReportRow[];
  eventDates: KitchenEventDates;
  variant?: "organizer" | "public";
}

const ROLE_LABELS: Record<string, string> = {
  participant: "Participante",
  facilitator: "Facilitador/a",
};

const DAY_ABBREVS = ["D", "L", "M", "X", "J", "V", "S"];

function formatDietary(reqs: string[]): string {
  return reqs.length > 0 ? reqs.join(", ") : "—";
}

function roomLabel(room: KitchenReportRow["room"]): string {
  if (!room) return "—";
  return room.display_name || room.internal_number;
}

function getDayHeaders(dateStart: Date, totalDays: number): { abbrev: string; dayNum: number }[] {
  const headers: { abbrev: string; dayNum: number }[] = [];
  const start = new Date(dateStart);
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    headers.push({
      abbrev: DAY_ABBREVS[d.getDay()],
      dayNum: d.getDate(),
    });
  }
  return headers;
}

function encodeMealDay(m: { breakfast: boolean; lunch: boolean; dinner: boolean }): string {
  return (m.breakfast ? "d" : "-") + (m.lunch ? "a" : "-") + (m.dinner ? "c" : "-");
}

export function KitchenReportClient({
  eventId,
  eventName,
  rows: initialRows,
  eventDates,
  variant = "organizer",
}: KitchenReportClientProps) {
  const isPublic = variant === "public";
  const [rows, setRows] = useState(initialRows);
  const [, startTransition] = useTransition();

  const dayHeaders = getDayHeaders(eventDates.dateStart, eventDates.totalDays);

  const totalPersons = rows.length;
  const withDietary = rows.filter(
    (r) => r.person.dietary_requirements.length > 0
  ).length;
  const withAllergies = rows.filter(
    (r) => r.person.allergies_text
  ).length;

  function handleMealToggle(
    epId: string,
    dayIndex: number,
    field: "breakfast" | "lunch" | "dinner",
    value: boolean
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== epId) return r;
        return {
          ...r,
          meal_days: r.meal_days.map((md) =>
            md.day_index === dayIndex ? { ...md, [field]: value } : md
          ),
        };
      })
    );
    startTransition(() => {
      updateMealAttendance(epId, dayIndex, field, value);
    });
  }

  function markNotified() {
    setRows((prev) => prev.map((r) => ({ ...r, dietary_notified: true })));
    startTransition(() => {
      markAllDietaryNotified(eventId);
    });
  }

  function handleExportCsv() {
    const dayHeaderLabels = dayHeaders.map((h) => `${h.abbrev}${h.dayNum}`);
    const headers = [
      "Nombre",
      isPublic ? "Habitación" : "Rol",
      "Dieta",
      "Alergias",
      ...dayHeaderLabels,
      ...(isPublic ? [] : ["Solicitudes", "Notificado"]),
    ];
    const csvRows = rows.map((r) => {
      const dayValues = dayHeaders.map((_, i) => {
        const md = r.meal_days.find((m) => m.day_index === i);
        return md ? encodeMealDay(md) : "---";
      });
      return [
        r.person.name_display,
        isPublic ? roomLabel(r.room) : (ROLE_LABELS[r.role] ?? r.role),
        formatDietary(r.person.dietary_requirements),
        r.person.allergies_text ?? "—",
        ...dayValues,
        ...(isPublic
          ? []
          : [r.requests_text ?? "—", r.dietary_notified ? "Sí" : "No"]),
      ];
    });

    const csvContent = [headers, ...csvRows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    const safeName = eventName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "").replace(/\s+/g, "-");
    a.href = url;
    a.download = `cocina-${safeName}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (!isPublic) markNotified();
  }

  function handlePrint() {
    if (!isPublic) markNotified();
    window.print();
  }

  const fixedCols = isPublic ? 4 : 6; // name, role/room, diet, allergies [+ requests, notified]
  const colCount = fixedCols + eventDates.totalDays;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:mb-4">
        <div>
          {!isPublic && (
            <Link
              href={`/events/${eventId}/detail`}
              className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 print:hidden"
            >
              <ArrowLeft className="size-4" />
              Volver al detalle
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            Informe de Cocina
          </h1>
          <p className="mt-1 text-sm text-gray-500">{eventName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {!isPublic && <KitchenShareButton eventId={eventId} />}
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-1 size-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1 size-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4 print:mb-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalPersons}</p>
          <p className="text-sm text-gray-500">Total personas</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{withDietary}</p>
          <p className="text-sm text-gray-500">Con dieta especial</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-red-600">{withAllergies}</p>
          <p className="text-sm text-gray-500">Con alergias</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-500 print:mb-1">
        <span><strong>d</strong> = desayuno</span>
        <span><strong>a</strong> = almuerzo</span>
        <span><strong>c</strong> = cena</span>
        <span className="ml-2 inline-block h-3 w-6 rounded bg-amber-50 border border-amber-200" /> = descuentos de comida pendientes
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700">Nombre</th>
              {isPublic ? (
                <th className="px-4 py-3 font-semibold text-gray-700">Habitación</th>
              ) : (
                <th className="px-4 py-3 font-semibold text-gray-700">Rol</th>
              )}
              <th className="px-4 py-3 font-semibold text-gray-700">Dieta</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Alergias</th>
              {dayHeaders.map((h, i) => (
                <th
                  key={i}
                  className="px-1 py-3 text-center font-semibold text-gray-700"
                  title={`Día ${h.dayNum}`}
                >
                  <div className="text-xs leading-tight">{h.abbrev}</div>
                  <div className="text-[10px] leading-tight text-gray-400">{h.dayNum}</div>
                </th>
              ))}
              {!isPublic && (
                <>
                  <th className="px-4 py-3 font-semibold text-gray-700">Solicitudes</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    Notificado
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-gray-100 ${
                  r.has_meal_discounts ? "bg-amber-50" : "hover:bg-gray-50"
                }`}
              >
                <td className="px-4 py-2 font-medium text-gray-900">
                  {r.person.name_display}
                </td>
                {isPublic ? (
                  <td className="px-4 py-2 text-gray-600">
                    {roomLabel(r.room)}
                  </td>
                ) : (
                  <td className="px-4 py-2 text-gray-600">
                    {ROLE_LABELS[r.role] ?? r.role}
                  </td>
                )}
                <td className="px-4 py-2 text-gray-600">
                  {formatDietary(r.person.dietary_requirements)}
                </td>
                <td className={`px-4 py-2 ${r.person.allergies_text ? "font-medium text-red-700" : "text-gray-400"}`}>
                  {r.person.allergies_text ?? "—"}
                </td>
                {dayHeaders.map((_, dayIdx) => {
                  const md = r.meal_days.find((m) => m.day_index === dayIdx);
                  if (!md) {
                    return (
                      <td key={dayIdx} className="px-1 py-2 text-center text-gray-300">
                        —
                      </td>
                    );
                  }
                  return (
                    <td key={dayIdx} className="px-0 py-1 text-center">
                      <div className="flex flex-col items-center gap-0">
                        <MealCheckbox
                          label="d"
                          checked={md.breakfast}
                          disabled={isPublic}
                          onChange={(v) => handleMealToggle(r.id, dayIdx, "breakfast", v)}
                        />
                        <MealCheckbox
                          label="a"
                          checked={md.lunch}
                          disabled={isPublic}
                          onChange={(v) => handleMealToggle(r.id, dayIdx, "lunch", v)}
                        />
                        <MealCheckbox
                          label="c"
                          checked={md.dinner}
                          disabled={isPublic}
                          onChange={(v) => handleMealToggle(r.id, dayIdx, "dinner", v)}
                        />
                      </div>
                    </td>
                  );
                })}
                {!isPublic && (
                  <>
                    <td className="px-4 py-2 text-gray-600">
                      {r.requests_text ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {r.dietary_notified ? (
                        r.person.dietary_requirements.length > 0 || r.person.allergies_text ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                            Sí
                          </span>
                        )
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          No
                        </span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-gray-400">
                  No hay participantes en este evento
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MealCheckbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-0.5 cursor-pointer text-[10px] text-gray-500 leading-none py-[1px]">
      {disabled ? (
        <span className={`size-3 inline-flex items-center justify-center rounded text-[9px] font-bold ${
          checked ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-300"
        }`}>
          {checked ? "✓" : ""}
        </span>
      ) : (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-3 rounded border-gray-300 text-primary accent-primary"
        />
      )}
      <span>{label}</span>
    </label>
  );
}
