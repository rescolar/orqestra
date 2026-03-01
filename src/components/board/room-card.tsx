import { cn } from "@/lib/utils";

type RoomCardProps = {
  id: string;
  displayName: string;
  internalNumber: string;
  capacity: number;
  assignedCount: number;
  locked: boolean;
  hasPrivateBathroom: boolean;
  genderRestriction: string;
  hasTentatives: boolean;
  hasGenderViolation: boolean;
};

type RoomStatus = "ok" | "warn" | "danger" | "closed";

function deriveStatus(props: {
  locked: boolean;
  assignedCount: number;
  capacity: number;
  hasGenderViolation: boolean;
  hasTentatives: boolean;
}): RoomStatus {
  if (props.locked) return "closed";
  if (props.assignedCount > props.capacity) return "danger";
  if (props.hasGenderViolation) return "danger";
  if (props.assignedCount < props.capacity) return "warn";
  if (props.hasTentatives) return "warn";
  return "ok";
}

const statusBarColor: Record<RoomStatus, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  danger: "bg-danger",
  closed: "bg-gray-200",
};

const statusLabel: Record<RoomStatus, string> = {
  ok: "Completa",
  warn: "Disponible",
  danger: "Acción Requerida",
  closed: "Cerrada",
};

const statusTextColor: Record<RoomStatus, string> = {
  ok: "text-success",
  warn: "text-secondary",
  danger: "text-danger",
  closed: "text-secondary",
};

export function RoomCard({
  displayName,
  internalNumber,
  capacity,
  assignedCount,
  locked,
  hasPrivateBathroom,
  genderRestriction,
  hasTentatives,
  hasGenderViolation,
}: RoomCardProps) {
  const status = deriveStatus({
    locked,
    assignedCount,
    capacity,
    hasGenderViolation,
    hasTentatives,
  });

  const emptySlots = Math.max(0, capacity - assignedCount);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 card-shadow transition-shadow hover:shadow-md",
        status === "danger" && "border-2 border-danger/30",
        status === "warn" && "border-warning/40"
      )}
    >
      {/* Color bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          statusBarColor[status]
        )}
      />

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-primary">{displayName}</h3>
          <p className="text-[10px] uppercase tracking-wider text-gray-400">
            #{internalNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPrivateBathroom && (
            <span className="material-symbols-outlined text-base text-gray-400">
              bathroom
            </span>
          )}
          {genderRestriction !== "mixed" && (
            <span className="text-[10px] uppercase tracking-wider text-gray-400">
              {genderRestriction === "women" ? "Mujeres" : "Hombres"}
            </span>
          )}
          <span
            className={cn(
              "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold",
              status === "danger"
                ? "bg-danger/10 text-danger"
                : "bg-gray-100 text-primary"
            )}
          >
            {assignedCount}/{capacity}
            {status === "danger" && (
              <span className="material-symbols-outlined ml-1 text-sm">
                warning
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Body — person slots */}
      <div className="mb-4 space-y-2">
        {/* Placeholder for assigned persons (Epic 3) */}
        {Array.from({ length: assignedCount }).map((_, i) => (
          <div
            key={`assigned-${i}`}
            className="flex h-12 items-center rounded-lg bg-gray-50 p-3"
          >
            <div className="h-3 w-24 rounded bg-gray-200" />
          </div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex h-12 items-center justify-center rounded-lg border-2 border-dashed border-gray-200"
          >
            <span className="text-xs text-gray-300">Vacante</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 pt-3">
        <p
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            statusTextColor[status]
          )}
        >
          {status === "closed" && (
            <span className="material-symbols-outlined text-sm">lock</span>
          )}
          {statusLabel[status]}
        </p>
      </div>
    </div>
  );
}
