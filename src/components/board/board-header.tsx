import Link from "next/link";

type BoardHeaderProps = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  assignedCount: number;
  totalPersons: number;
  roomCount: number;
  unassignedCount: number;
  pendingCount: number;
  userName?: string | null;
  onPendingClick?: () => void;
  onPreAssign?: () => void;
  preAssigning?: boolean;
  onUndo?: () => void;
  undoing?: boolean;
  canUndo?: boolean;
};

function formatDateRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(start)} — ${fmt.format(end)}`;
}

function KPI({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="text-center px-4">
      <p className="text-[10px] uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className={`text-lg font-semibold ${danger ? "text-danger" : "text-primary"}`}>{value}</p>
    </div>
  );
}

export function BoardHeader({
  eventId,
  eventName,
  dateStart,
  dateEnd,
  assignedCount,
  totalPersons,
  roomCount,
  unassignedCount,
  pendingCount,
  userName,
  onPendingClick,
  onPreAssign,
  preAssigning,
  onUndo,
  undoing,
  canUndo,
}: BoardHeaderProps) {
  return (
    <header className={`flex items-center justify-between border-b px-6 py-4 ${pendingCount === 0 ? "bg-success/5" : "bg-white"}`}>
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
        <button
          onClick={onPendingClick}
          className="cursor-pointer rounded-lg px-1 py-1 transition-colors hover:bg-gray-100"
        >
          <KPI label="Pendientes" value={pendingCount} danger={pendingCount > 0} />
        </button>

        <div className="ml-4 flex items-center gap-3">
          <Link
            href={`/events/${eventId}/schedule`}
            className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary hover:bg-primary/10"
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            Programa
          </Link>
          <button
            onClick={onPreAssign}
            disabled={unassignedCount === 0 || preAssigning}
            className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">auto_fix_high</span>
            {preAssigning ? "Asignando..." : "Pre-asignar"}
          </button>
          <button
            onClick={onUndo}
            disabled={!canUndo || undoing}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-base">undo</span>
            {undoing ? "Deshaciendo..." : "Deshacer"}
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
            {userName?.[0]?.toUpperCase() ?? "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
