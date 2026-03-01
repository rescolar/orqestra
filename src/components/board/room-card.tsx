"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type AssignedPerson = {
  id: string;
  role: string;
  person: {
    name_display: string;
    name_initials: string;
    gender: string;
  };
};

type RoomCardProps = {
  id: string;
  displayName: string;
  internalNumber: string;
  capacity: number;
  locked: boolean;
  hasPrivateBathroom: boolean;
  genderRestriction: string;
  hasTentatives: boolean;
  hasGenderViolation: boolean;
  assignedPersons: AssignedPerson[];
  onUnassign?: (personId: string) => void;
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
  id,
  displayName,
  internalNumber,
  capacity,
  locked,
  hasPrivateBathroom,
  genderRestriction,
  hasTentatives,
  hasGenderViolation,
  assignedPersons,
  onUnassign,
}: RoomCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const assignedCount = assignedPersons.length;
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
      ref={setNodeRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 card-shadow transition-all hover:shadow-md",
        status === "danger" && "border-2 border-danger/30",
        status === "warn" && "border-warning/40",
        isOver && !locked && "ring-2 ring-primary/40 border-primary/30 bg-primary/[0.02]"
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
        {assignedPersons.map((ep) => (
          <DraggableRoomPerson key={ep.id} ep={ep} onUnassign={onUnassign} />
        ))}
        {/* Empty slots */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className={cn(
              "flex h-12 items-center justify-center rounded-lg border-2 border-dashed border-gray-200",
              isOver && !locked && "border-primary/30 bg-primary/[0.03]"
            )}
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

function DraggableRoomPerson({
  ep,
  onUnassign,
}: {
  ep: AssignedPerson;
  onUnassign?: (personId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: ep.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        "group flex h-12 cursor-grab items-center gap-2 rounded-lg bg-gray-50 px-3",
        isDragging && "opacity-30"
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
        {ep.person.name_initials}
      </div>
      <span className="flex-1 truncate text-sm text-gray-700">
        {ep.person.name_display}
      </span>
      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
        {ep.role === "facilitator" ? "fac" : "par"}
      </span>
      {onUnassign && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnassign(ep.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="hidden h-5 w-5 items-center justify-center rounded text-gray-300 hover:bg-gray-200 hover:text-gray-600 group-hover:flex"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      )}
    </div>
  );
}
