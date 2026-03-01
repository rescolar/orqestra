import { getEvents } from "@/lib/actions/event";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
          <CreateEventDialog />
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
            <Link
              key={event.id}
              href={`/events/${event.id}/board`}
              className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary">
                  {event.name}
                </h2>
                {event.status !== "active" && (
                  <Badge variant="secondary" className="capitalize">
                    {event.status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {formatDateRange(event.date_start, event.date_end)}
              </p>
              <div className="mt-auto pt-2">
                <Badge variant="outline">
                  {event.assigned_count}/{event.estimated_participants}{" "}
                  asignados
                </Badge>
              </div>
            </Link>
          ))}
          <CreateEventDialog />
        </div>
      )}
    </div>
  );
}
