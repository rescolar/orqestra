"use client";

import Link from "next/link";
import type { PrintDaySchedule } from "@/lib/services/schedule.service";

type Props = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  scheduleConfirmed: boolean;
  schedule: PrintDaySchedule[];
  confirmedParticipants: number;
};

function formatDayHeader(date: Date, dayIndex: number) {
  const d = new Date(date);
  const fmt = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formatted = fmt.format(d);
  return `Día ${dayIndex + 1} — ${formatted.charAt(0).toUpperCase() + formatted.slice(1)}`;
}

function formatDateRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} — ${fmt.format(new Date(end))}`;
}

export function SchedulePrintClient({
  eventId,
  eventName,
  dateStart,
  dateEnd,
  scheduleConfirmed,
  schedule,
  confirmedParticipants,
}: Props) {
  const totalBlocks = schedule.reduce((sum, d) => sum + d.blocks.length, 0);
  const parallelActivities = schedule.reduce(
    (sum, d) =>
      sum +
      d.blocks
        .filter((b) => b.type === "parallel")
        .reduce((s, b) => s + b.activities.length, 0),
    0
  );
  const hasParallel = schedule.some((d) =>
    d.blocks.some((b) => b.type === "parallel")
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header — hidden in print */}
      <header className="flex items-center justify-between border-b px-6 py-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}/schedule`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver al programa
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{schedule.length} días</span>
            <span>{totalBlocks} bloques</span>
            <span>{parallelActivities} act. paralelas</span>
            <span>{confirmedParticipants} participantes</span>
            {scheduleConfirmed && (
              <span className="flex items-center gap-1 text-success">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Confirmada
              </span>
            )}
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir
          </button>
        </div>
      </header>

      {/* Print-only title */}
      <div className="hidden print:block print:pb-2 print:pt-1 print:text-center">
        <h1 className="text-lg font-bold">{eventName}</h1>
        <p className="text-xs text-gray-500">
          {formatDateRange(dateStart, dateEnd)} · {confirmedParticipants} participantes
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 print:max-w-none print:px-4 print:py-2">
        {/* Section 1: Master Schedule */}
        <h2 className="mb-4 text-lg font-bold text-primary print:text-base print:text-black">
          Programa General
        </h2>

        {schedule.map((day) => (
          <div key={day.day_index} className="mb-6 print:mb-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700 print:text-xs">
              {formatDayHeader(day.date, day.day_index)}
            </h3>
            <table className="w-full border-collapse text-sm print:text-xs">
              <thead>
                <tr className="border-b-2 border-gray-200 text-left">
                  <th className="w-32 py-2 pr-3 font-medium text-gray-500 print:w-24">
                    Horario
                  </th>
                  <th className="py-2 pr-3 font-medium text-gray-500">
                    Actividad
                  </th>
                  <th className="py-2 font-medium text-gray-500">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody>
                {day.blocks.map((block) => {
                  if (block.type === "common") {
                    const act = block.activities[0];
                    return (
                      <tr key={block.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3 align-top text-gray-600">
                          {block.time_label || "—"}
                        </td>
                        <td className="py-2 pr-3 align-top font-medium">
                          {act?.title || "—"}
                        </td>
                        <td className="py-2 align-top text-gray-600">
                          {act?.description || ""}
                        </td>
                      </tr>
                    );
                  }

                  // Parallel block: one sub-row per activity
                  return block.activities.map((act, i) => (
                    <tr
                      key={act.id}
                      className={
                        i === block.activities.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }
                    >
                      {i === 0 && (
                        <td
                          className="py-2 pr-3 align-top text-gray-600"
                          rowSpan={block.activities.length}
                        >
                          {block.time_label || "—"}
                        </td>
                      )}
                      <td className="py-1 pr-3 align-top">
                        <span className="font-medium">{act.title}</span>
                        {act.max_participants != null && (
                          <span className="ml-1 text-gray-400">
                            ({act.signup_count}/{act.max_participants})
                          </span>
                        )}
                        {act.max_participants == null && act.signup_count > 0 && (
                          <span className="ml-1 text-gray-400">
                            ({act.signup_count})
                          </span>
                        )}
                      </td>
                      <td className="py-1 align-top text-gray-600">
                        {act.description || ""}
                      </td>
                    </tr>
                  ));
                })}
                {day.blocks.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-4 text-center text-gray-400 italic"
                    >
                      Sin actividades programadas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        {/* Section 2: Assignment Lists (only if there are parallel blocks) */}
        {hasParallel && (
          <>
            <div className="mt-10 print:mt-6 print:break-before-page">
              <h2 className="mb-4 text-lg font-bold text-primary print:text-base print:text-black">
                Listas de Asignación
              </h2>
            </div>

            {schedule.map((day) => {
              const parallelBlocks = day.blocks.filter(
                (b) => b.type === "parallel"
              );
              if (parallelBlocks.length === 0) return null;

              return (
                <div
                  key={`assign-${day.day_index}`}
                  className="mb-8 print:mb-4 print:break-before-page"
                >
                  <h3 className="mb-3 text-sm font-semibold text-gray-700 print:text-xs">
                    {formatDayHeader(day.date, day.day_index)}
                  </h3>

                  {parallelBlocks.map((block) => (
                    <div key={block.id} className="mb-6 print:mb-4">
                      <div className="mb-2 border-b border-gray-300 pb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                        {block.time_label || "Sin horario"}
                      </div>

                      <div className="grid grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                        {block.activities.map((act) => (
                          <div key={act.id}>
                            <h4 className="mb-1.5 text-sm font-semibold print:text-xs">
                              {act.title}
                              {act.max_participants != null && (
                                <span
                                  className={`ml-1.5 font-normal ${
                                    act.signup_count > act.max_participants
                                      ? "text-danger"
                                      : "text-gray-400"
                                  }`}
                                >
                                  ({act.signup_count}/{act.max_participants})
                                </span>
                              )}
                              {act.max_participants == null &&
                                act.signup_count > 0 && (
                                  <span className="ml-1.5 font-normal text-gray-400">
                                    ({act.signup_count})
                                  </span>
                                )}
                            </h4>
                            {act.assigned_names.length > 0 ? (
                              <ul className="space-y-0.5">
                                {act.assigned_names.map((name, i) => (
                                  <li
                                    key={i}
                                    className="flex items-center gap-2 text-sm print:text-xs"
                                  >
                                    <span className="inline-block h-3.5 w-3.5 flex-shrink-0 border border-gray-400 print:border-gray-600" />
                                    {name}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm italic text-gray-400 print:text-xs">
                                Sin asignaciones
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
