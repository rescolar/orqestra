"use client";

import { useState } from "react";
import Link from "next/link";

type ScheduleHeaderProps = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  unassignedBlockCount: number;
  overCapacityCount: number;
  scheduleConfirmed: boolean;
  onIncidentsClick: () => void;
  onConfirmSchedule: () => void;
};

function formatDateRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} — ${fmt.format(new Date(end))}`;
}

export function ScheduleHeader({
  eventId,
  eventName,
  dateStart,
  dateEnd,
  unassignedBlockCount,
  overCapacityCount,
  scheduleConfirmed,
  onIncidentsClick,
  onConfirmSchedule,
}: ScheduleHeaderProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const totalIncidents = unassignedBlockCount + overCapacityCount;

  const handleConfirmClick = () => {
    if (totalIncidents > 0) {
      setShowConfirmDialog(true);
    } else {
      doConfirm();
    }
  };

  const doConfirm = async () => {
    setConfirming(true);
    await onConfirmSchedule();
    setConfirming(false);
    setShowConfirmDialog(false);
  };

  return (
    <header
      className={`flex items-center justify-between border-b px-6 py-4 transition-colors ${
        scheduleConfirmed && totalIncidents === 0
          ? "bg-success/5"
          : "bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center justify-center rounded-lg bg-primary p-2 text-white"
        >
          <span className="material-symbols-outlined text-xl">grid_view</span>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">{eventName}</h1>
          <p className="text-sm text-gray-400">
            {formatDateRange(dateStart, dateEnd)} · Programa
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* KPIs */}
        <div className="flex items-center gap-4 text-sm">
          <div
            className={`flex items-center gap-1 ${
              unassignedBlockCount > 0 ? "text-warning" : "text-gray-400"
            }`}
          >
            <span className="material-symbols-outlined text-base">group_off</span>
            <span className="font-medium">{unassignedBlockCount}</span>
            <span className="hidden text-xs lg:inline">sin asignar</span>
          </div>
          <div
            className={`flex items-center gap-1 ${
              overCapacityCount > 0 ? "text-danger" : "text-gray-400"
            }`}
          >
            <span className="material-symbols-outlined text-base">warning</span>
            <span className="font-medium">{overCapacityCount}</span>
            <span className="hidden text-xs lg:inline">exceso</span>
          </div>
        </div>

        {/* Incidents button */}
        <button
          onClick={onIncidentsClick}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            totalIncidents > 0
              ? "bg-danger/10 text-danger hover:bg-danger/20"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          <span className="material-symbols-outlined text-base">error</span>
          Incidencias: {totalIncidents}
        </button>

        {/* Confirm / Confirmed */}
        {scheduleConfirmed ? (
          <span className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Confirmada
          </span>
        ) : (
          <button
            onClick={handleConfirmClick}
            disabled={confirming}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {confirming ? "Confirmando..." : "Confirmar agenda"}
          </button>
        )}

        <Link
          href={`/events/${eventId}/schedule-print`}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <span className="material-symbols-outlined text-base">print</span>
          Imprimir
        </Link>

        <Link
          href={`/events/${eventId}/board`}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Tablero
        </Link>
      </div>

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2 text-warning">
              <span className="material-symbols-outlined">warning</span>
              <h3 className="text-lg font-semibold text-gray-900">
                Hay incidencias pendientes
              </h3>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              {unassignedBlockCount > 0 && (
                <span className="block">
                  · {unassignedBlockCount} bloque(s) sin asignar completamente
                </span>
              )}
              {overCapacityCount > 0 && (
                <span className="block">
                  · {overCapacityCount} actividad(es) con exceso de aforo
                </span>
              )}
            </p>
            <p className="mb-6 text-sm text-gray-600">
              ¿Deseas confirmar la agenda de todas formas?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={doConfirm}
                disabled={confirming}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {confirming ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
