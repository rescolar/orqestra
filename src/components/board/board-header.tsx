import Link from "next/link";

type BoardHeaderProps = {
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  assignedCount: number;
  totalPersons: number;
  roomCount: number;
  unassignedCount: number;
  userName?: string | null;
};

function formatDateRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(start)} — ${fmt.format(end)}`;
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center px-4">
      <p className="text-[10px] uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}

export function BoardHeader({
  eventName,
  dateStart,
  dateEnd,
  assignedCount,
  totalPersons,
  roomCount,
  unassignedCount,
  userName,
}: BoardHeaderProps) {
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
            {formatDateRange(dateStart, dateEnd)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <KPI
          label="Asignados"
          value={`${assignedCount}/${totalPersons}`}
        />
        <KPI label="Rooms" value={roomCount} />
        <KPI label="No Asignados" value={unassignedCount} />
        <KPI label="Pendientes" value={0} />

        <div className="ml-4 flex items-center gap-3">
          <button className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
            <span className="material-symbols-outlined text-base">undo</span>
            Deshacer
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
            {userName?.[0]?.toUpperCase() ?? "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
