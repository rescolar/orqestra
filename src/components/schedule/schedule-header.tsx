import Link from "next/link";

type ScheduleHeaderProps = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
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
}: ScheduleHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
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
      <Link
        href={`/events/${eventId}/board`}
        className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Tablero
      </Link>
    </header>
  );
}
