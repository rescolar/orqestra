"use client";

import { useState, useTransition } from "react";
import { adminDeleteEvent } from "@/lib/actions/admin";
import Link from "next/link";

type Event = {
  id: string;
  name: string;
  date_start: Date;
  date_end: Date;
  status: string;
  location: string | null;
  user: { name: string; email: string };
  _count: { event_persons: number; rooms: number };
};

export function EventsTable({ events }: { events: Event[] }) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-3 font-medium">Evento</th>
            <th className="px-4 py-3 font-medium">Organizador</th>
            <th className="px-4 py-3 font-medium">Fechas</th>
            <th className="px-4 py-3 font-medium text-right">Participantes</th>
            <th className="px-4 py-3 font-medium text-right">Habitaciones</th>
            <th className="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                No hay eventos
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      try {
        await adminDeleteEvent(event.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error");
      }
      setShowDeleteConfirm(false);
    });
  }

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 font-medium text-gray-900">{event.name}</td>
      <td className="px-4 py-3 text-gray-600">
        <div>{event.user.name}</div>
        <div className="text-xs text-gray-400">{event.user.email}</div>
      </td>
      <td className="px-4 py-3 text-gray-600">
        {new Date(event.date_start).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
        {" – "}
        {new Date(event.date_end).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
      </td>
      <td className="px-4 py-3 text-right text-gray-600">{event._count.event_persons}</td>
      <td className="px-4 py-3 text-right text-gray-600">{event._count.rooms}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/events/${event.id}/board`}
            className="text-xs text-blue-600 hover:underline"
          >
            Ver tablero
          </Link>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-600 font-medium hover:underline"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Eliminar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
