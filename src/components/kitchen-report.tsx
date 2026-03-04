"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMealFlags, markAllDietaryNotified } from "@/lib/actions/kitchen";
import { KitchenShareButton } from "@/components/kitchen-share-button";
import type { KitchenReportRow } from "@/lib/services/kitchen.service";

interface KitchenReportClientProps {
  eventId: string;
  eventName: string;
  rows: KitchenReportRow[];
  variant?: "organizer" | "public";
}

const ROLE_LABELS: Record<string, string> = {
  participant: "Participante",
  facilitator: "Facilitador/a",
};

function formatDietary(reqs: string[]): string {
  return reqs.length > 0 ? reqs.join(", ") : "—";
}

function roomLabel(room: KitchenReportRow["room"]): string {
  if (!room) return "—";
  return room.display_name || room.internal_number;
}

export function KitchenReportClient({
  eventId,
  eventName,
  rows: initialRows,
  variant = "organizer",
}: KitchenReportClientProps) {
  const isPublic = variant === "public";
  const [rows, setRows] = useState(initialRows);
  const [, startTransition] = useTransition();

  const totalPersons = rows.length;
  const withDietary = rows.filter(
    (r) => r.person.dietary_requirements.length > 0
  ).length;
  const withAllergies = rows.filter(
    (r) => r.person.allergies_text
  ).length;

  function handleToggle(
    id: string,
    field: "arrives_for_dinner" | "last_meal_lunch",
    value: boolean
  ) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    startTransition(() => {
      updateMealFlags(id, { [field]: value });
    });
  }

  function markNotified() {
    setRows((prev) => prev.map((r) => ({ ...r, dietary_notified: true })));
    startTransition(() => {
      markAllDietaryNotified(eventId);
    });
  }

  function handleExportCsv() {
    const headers = [
      "Nombre",
      "Rol",
      "Dieta",
      "Alergias",
      "Cena llegada",
      "Almuerzo final",
      "Solicitudes",
      "Notificado",
    ];
    const csvRows = rows.map((r) => [
      r.person.name_display,
      ROLE_LABELS[r.role] ?? r.role,
      formatDietary(r.person.dietary_requirements),
      r.person.allergies_text ?? "—",
      r.arrives_for_dinner ? "Sí" : "No",
      r.last_meal_lunch ? "Sí" : "No",
      r.requests_text ?? "—",
      r.dietary_notified ? "Sí" : "No",
    ]);

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

  const colCount = isPublic ? 6 : 8;

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
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Cena llegada
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Almuerzo final
              </th>
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
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.person.name_display}
                </td>
                {isPublic ? (
                  <td className="px-4 py-3 text-gray-600">
                    {roomLabel(r.room)}
                  </td>
                ) : (
                  <td className="px-4 py-3 text-gray-600">
                    {ROLE_LABELS[r.role] ?? r.role}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-600">
                  {formatDietary(r.person.dietary_requirements)}
                </td>
                <td className={`px-4 py-3 ${r.person.allergies_text ? "font-medium text-red-700" : "text-gray-400"}`}>
                  {r.person.allergies_text ?? "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {isPublic ? (
                    r.arrives_for_dinner ? "Sí" : "No"
                  ) : (
                    <input
                      type="checkbox"
                      checked={r.arrives_for_dinner}
                      onChange={(e) =>
                        handleToggle(r.id, "arrives_for_dinner", e.target.checked)
                      }
                      className="size-4 rounded border-gray-300 text-primary accent-primary"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {isPublic ? (
                    r.last_meal_lunch ? "Sí" : "No"
                  ) : (
                    <input
                      type="checkbox"
                      checked={r.last_meal_lunch}
                      onChange={(e) =>
                        handleToggle(r.id, "last_meal_lunch", e.target.checked)
                      }
                      className="size-4 rounded border-gray-300 text-primary accent-primary"
                    />
                  )}
                </td>
                {!isPublic && (
                  <>
                    <td className="px-4 py-3 text-gray-600">
                      {r.requests_text ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
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
