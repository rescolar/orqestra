import { getEvents } from "@/lib/actions/event";
import { EventCard } from "@/components/event-card";
import Link from "next/link";
import { Plus } from "lucide-react";

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${s.toLocaleDateString("es-ES", sameYear ? opts : yearOpts)} – ${e.toLocaleDateString("es-ES", yearOpts)}`;
}

export default async function DashboardPage() {
  const events = await getEvents();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Mis Eventos</h1>

      {events.length === 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/events/new"
            className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-gray-500 transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-8" />
            <span className="text-sm font-medium">Nuevo Evento</span>
          </Link>
          <div className="col-span-full -mt-2">
            <p className="text-sm text-gray-500">
              Aún no tienes eventos. Crea uno para empezar a organizar tu
              retiro.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              name={event.name}
              dateRange={formatDateRange(event.date_start, event.date_end)}
              assignedCount={event.assigned_count}
              estimatedParticipants={event.estimated_participants}
              status={event.status}
            />
          ))}
          <Link
            href="/events/new"
            className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-gray-500 transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-8" />
            <span className="text-sm font-medium">Nuevo Evento</span>
          </Link>
        </div>
      )}
    </div>
  );
}
