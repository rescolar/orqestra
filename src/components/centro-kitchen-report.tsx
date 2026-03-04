"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicKitchenRow } from "@/lib/services/centro-share.service";

interface CentroKitchenReportProps {
  eventName: string;
  rows: PublicKitchenRow[];
}

function formatDietary(reqs: string[]): string {
  return reqs.length > 0 ? reqs.join(", ") : "—";
}

export function CentroKitchenReport({
  eventName,
  rows,
}: CentroKitchenReportProps) {
  const totalPersons = rows.length;
  const withDietary = rows.filter((r) => r.dietary_requirements.length > 0).length;
  const withAllergies = rows.filter((r) => r.allergies_text).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Informe de Cocina
          </h1>
          <p className="mt-1 text-sm text-gray-500">{eventName}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
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
              <th className="px-4 py-3 font-semibold text-gray-700">Habitación</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Dieta</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Alergias</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Cena llegada
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Almuerzo final
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.room ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatDietary(r.dietary_requirements)}
                </td>
                <td
                  className={`px-4 py-3 ${
                    r.allergies_text
                      ? "font-medium text-red-700"
                      : "text-gray-400"
                  }`}
                >
                  {r.allergies_text ?? "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.arrives_for_dinner ? "Sí" : "No"}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.last_meal_lunch ? "Sí" : "No"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-400"
                >
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
