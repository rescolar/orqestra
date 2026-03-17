"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  getPendingItems,
  PendingData,
  PendingDietary,
  PendingConflict,
  PendingPayment,
  PendingCancelRequest,
  PendingRequest,
  PendingAccommodationMismatch,
  PendingAutoAssignment,
} from "@/lib/actions/pending";
import { updateEventPerson } from "@/lib/actions/person";
import { updateRoomField } from "@/lib/actions/room";

type PendingsPanelProps = {
  eventId: string;
  refreshKey?: number;
  onClose: () => void;
  onPersonClick: (id: string) => void;
  onRoomClick: (roomId: string) => void;
  onItemResolved: () => void;
};

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: "Vegetariano",
  gluten_free: "Sin gluten",
  lactose_free: "Sin lactosa",
};

function describeDiet(ep: PendingDietary): string {
  const parts: string[] = [];
  for (const d of ep.person.dietary_requirements) {
    parts.push(DIETARY_LABELS[d] ?? d);
  }
  if (ep.person.allergies_text) parts.push(`Alergia: ${ep.person.allergies_text}`);
  return parts.join(", ");
}

function describeConflict(room: PendingConflict): string {
  const parts: string[] = [];
  if (room.assignedCount > room.capacity) {
    parts.push(`Capacidad excedida ${room.assignedCount}/${room.capacity}`);
  }
  if (room.gender_restriction !== "mixed") {
    const expected = room.gender_restriction === "women" ? "female" : "male";
    const hasViolation = room.genders.some(
      (g) => g !== expected && g !== "unknown"
    );
    if (hasViolation) {
      parts.push("Restriccion de genero");
    }
  }
  return parts.join(" · ");
}

export function PendingsPanel({
  eventId,
  refreshKey,
  onClose,
  onPersonClick,
  onRoomClick,
  onItemResolved,
}: PendingsPanelProps) {
  const [data, setData] = useState<PendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(["dietary", "conflicts", "payments", "cancelRequests", "requests", "accommodationMismatches", "autoAssignments"])
  );

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getPendingItems(eventId).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [eventId, refreshKey]);

  const handleDietaryResolved = useCallback(
    async (epId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, dietary: prev.dietary.filter((d) => d.id !== epId) };
      });
      await updateEventPerson(epId, eventId, { dietary_notified: true });
      onItemResolved();
    },
    [eventId, onItemResolved]
  );

  const handleConflictAcknowledged = useCallback(
    async (roomId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          conflicts: prev.conflicts.map((c) =>
            c.id === roomId ? { ...c, conflict_acknowledged: true } : c
          ),
        };
      });
      await updateRoomField(roomId, eventId, { conflict_acknowledged: true });
      onItemResolved();
    },
    [eventId, onItemResolved]
  );

  const handleMarkReservado = useCallback(
    async (epId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, payments: prev.payments.filter((p) => p.id !== epId) };
      });
      await updateEventPerson(epId, eventId, { status: "reservado" });
      onItemResolved();
    },
    [eventId, onItemResolved]
  );

  const handleConfirmCancel = useCallback(
    async (epId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, cancelRequests: prev.cancelRequests.filter((c) => c.id !== epId) };
      });
      await updateEventPerson(epId, eventId, { status: "cancelado" });
      onItemResolved();
    },
    [eventId, onItemResolved]
  );

  const handleRestoreFromCancel = useCallback(
    async (epId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, cancelRequests: prev.cancelRequests.filter((c) => c.id !== epId) };
      });
      await updateEventPerson(epId, eventId, { status: "inscrito" });
      onItemResolved();
    },
    [eventId, onItemResolved]
  );

  const handleRequestResolved = useCallback(
    async (epId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          requests: prev.requests.filter((r) => r.id !== epId),
        };
      });
      await updateEventPerson(epId, eventId, { requests_managed: true });
      onItemResolved();
    },
    [eventId, onItemResolved]
  );

  const handleMismatchManaged = useCallback(
    async (epId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          accommodationMismatches: prev.accommodationMismatches.filter((m) => m.id !== epId),
        };
      });
      await updateEventPerson(epId, eventId, { accommodation_mismatch_managed: true });
      onItemResolved();
    },
    [eventId, onItemResolved]
  );

  const handleAutoAssignManaged = useCallback(
    async (epId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          autoAssignments: prev.autoAssignments.filter((a) => a.id !== epId),
        };
      });
      await updateEventPerson(epId, eventId, { auto_assign_managed: true });
      onItemResolved();
    },
    [eventId, onItemResolved]
  );

  if (loading) {
    return (
      <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </aside>
    );
  }

  if (!data) return null;

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-warning">
            pending_actions
          </span>
          <h3 className="text-base font-semibold text-gray-800">
            Pendientes
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="flex-1 divide-y divide-gray-100 px-4">
        {/* Dietary / Allergies */}
        <PendingSection
          label="Alergias y Dietas"
          icon="restaurant"
          count={data.dietary.length}
          accentColor="text-danger"
          open={openSections.has("dietary")}
          onToggle={() => toggleSection("dietary")}
        >
          {data.dietary.length === 0 ? (
            <p className="text-xs text-gray-400">Sin pendientes</p>
          ) : (
            <div className="space-y-1">
              {data.dietary.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <button
                    onClick={() => onPersonClick(item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-700">
                      {item.person.name_display}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {describeDiet(item)}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDietaryResolved(item.id)}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-success/10 hover:text-success hover:border-success/30"
                  >
                    Gestionado
                  </button>
                </div>
              ))}
            </div>
          )}
        </PendingSection>

        {/* Room Conflicts */}
        <PendingSection
          label="Conflictos de Habitacion"
          icon="warning"
          count={data.conflicts.length}
          accentColor="text-warning"
          open={openSections.has("conflicts")}
          onToggle={() => toggleSection("conflicts")}
        >
          {data.conflicts.length === 0 ? (
            <p className="text-xs text-gray-400">Sin pendientes</p>
          ) : (
            <div className="space-y-1">
              {data.conflicts.map((room) => (
                <div
                  key={room.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <button
                    onClick={() => onRoomClick(room.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-700">
                      {room.display_name || `Hab ${room.internal_number}`}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {describeConflict(room)}
                    </p>
                  </button>
                  {room.assignedCount > room.capacity && (
                    <button
                      onClick={() => handleConflictAcknowledged(room.id)}
                      disabled={room.conflict_acknowledged}
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium",
                        room.conflict_acknowledged
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-gray-200 text-gray-500 hover:bg-success/10 hover:text-success hover:border-success/30"
                      )}
                    >
                      {room.conflict_acknowledged ? "Reconocido" : "Reconocer"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </PendingSection>

        {/* Pending Payments — only when pricing configured */}
        {data.hasPricing && (
          <PendingSection
            label="Pagos Pendientes"
            icon="payments"
            count={data.payments.length}
            accentColor="text-warning"
            open={openSections.has("payments")}
            onToggle={() => toggleSection("payments")}
          >
            {data.payments.length === 0 ? (
              <p className="text-xs text-gray-400">Sin pendientes</p>
            ) : (
              <div className="space-y-1">
                {data.payments.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                  >
                    <button
                      onClick={() => onPersonClick(item.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="truncate text-sm font-medium text-gray-700">
                        {item.person.name_display}
                      </p>
                    </button>
                    <button
                      onClick={() => handleMarkReservado(item.id)}
                      className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-success/10 hover:text-success hover:border-success/30"
                    >
                      Marcar Reservado
                    </button>
                  </div>
                ))}
              </div>
            )}
          </PendingSection>
        )}

        {/* Cancellation Requests */}
        <PendingSection
          label="Solicitudes de Cancelación"
          icon="person_cancel"
          count={data.cancelRequests.length}
          accentColor="text-danger"
          open={openSections.has("cancelRequests")}
          onToggle={() => toggleSection("cancelRequests")}
        >
          {data.cancelRequests.length === 0 ? (
            <p className="text-xs text-gray-400">Sin pendientes</p>
          ) : (
            <div className="space-y-1">
              {data.cancelRequests.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <button
                    onClick={() => onPersonClick(item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-700">
                      {item.person.name_display}
                    </p>
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleRestoreFromCancel(item.id)}
                      className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-accent/10 hover:text-accent hover:border-accent/30"
                    >
                      Restaurar
                    </button>
                    <button
                      onClick={() => handleConfirmCancel(item.id)}
                      className="shrink-0 rounded-md border border-danger/30 px-2 py-1 text-[10px] font-medium text-danger hover:bg-danger/10"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PendingSection>

        {/* Unresolved Requests */}
        <PendingSection
          label="Preferencias no Resueltas"
          icon="chat_bubble"
          count={data.requests.length}
          accentColor="text-primary"
          open={openSections.has("requests")}
          onToggle={() => toggleSection("requests")}
        >
          {data.requests.length === 0 ? (
            <p className="text-xs text-gray-400">Sin pendientes</p>
          ) : (
            <div className="space-y-1">
              {data.requests.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <button
                    onClick={() => onPersonClick(item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-700">
                      {item.person.name_display}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {item.requests_text.length > 50
                        ? item.requests_text.slice(0, 50) + "..."
                        : item.requests_text}
                    </p>
                  </button>
                  <button
                    onClick={() => handleRequestResolved(item.id)}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-success/10 hover:text-success hover:border-success/30"
                  >
                    Gestionado
                  </button>
                </div>
              ))}
            </div>
          )}
        </PendingSection>

        {/* Accommodation Mismatches */}
        <PendingSection
          label="Desajuste de Alojamiento"
          icon="swap_horiz"
          count={data.accommodationMismatches.length}
          accentColor="text-warning"
          open={openSections.has("accommodationMismatches")}
          onToggle={() => toggleSection("accommodationMismatches")}
        >
          {data.accommodationMismatches.length === 0 ? (
            <p className="text-xs text-gray-400">Sin pendientes</p>
          ) : (
            <div className="space-y-1">
              {data.accommodationMismatches.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <button
                    onClick={() => onPersonClick(item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-700">
                      {item.person.name_display}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      Pidió {item.preferredRoomTypeName}, asignado a {item.actualRoomTypeName}
                    </p>
                  </button>
                  <button
                    onClick={() => handleMismatchManaged(item.id)}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-success/10 hover:text-success hover:border-success/30"
                  >
                    Gestionado
                  </button>
                </div>
              ))}
            </div>
          )}
        </PendingSection>

        {/* Auto-assignments */}
        <PendingSection
          label="Auto-asignaciones"
          icon="assignment_ind"
          count={data.autoAssignments.length}
          accentColor="text-amber-600"
          open={openSections.has("autoAssignments")}
          onToggle={() => toggleSection("autoAssignments")}
        >
          {data.autoAssignments.length === 0 ? (
            <p className="text-xs text-gray-400">Sin pendientes</p>
          ) : (
            <div className="space-y-1">
              {data.autoAssignments.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <button
                    onClick={() => onPersonClick(item.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-700">
                      {item.person.name_display}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {item.roomName}
                    </p>
                  </button>
                  <button
                    onClick={() => handleAutoAssignManaged(item.id)}
                    className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-success/10 hover:text-success hover:border-success/30"
                  >
                    Gestionado
                  </button>
                </div>
              ))}
            </div>
          )}
        </PendingSection>
      </div>
    </aside>
  );
}

function PendingSection({
  label,
  icon,
  count,
  accentColor,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: string;
  count: number;
  accentColor: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2"
      >
        <span
          className="material-symbols-outlined text-base text-gray-400 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        >
          chevron_right
        </span>
        <span className={cn("material-symbols-outlined text-sm", accentColor)}>
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span className="flex-1" />
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-medium",
            count > 0 ? "bg-gray-100 text-gray-600" : "text-gray-300"
          )}
        >
          {count}
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
