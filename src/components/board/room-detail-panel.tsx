"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  getRoomDetail,
  updateRoomField,
  deleteRoom as deleteRoomAction,
} from "@/lib/actions/room";

type AssignedPerson = {
  id: string;
  role: string;
  person: {
    name_display: string;
    name_initials: string;
    gender: string;
  };
};

type RoomDetail = {
  id: string;
  internal_number: string;
  display_name: string | null;
  capacity: number;
  has_private_bathroom: boolean;
  gender_restriction: string;
  locked: boolean;
  locked_reason: string | null;
  description: string | null;
  event_persons: AssignedPerson[];
};

type RoomDetailPanelProps = {
  roomId: string;
  eventId: string;
  onClose: () => void;
  onRoomUpdated: () => void;
  onPersonClick?: (id: string) => void;
  onUnassign?: (personId: string) => void;
};

type RoomStatus = "closed" | "danger" | "warn" | "ok";

function deriveStatus(room: {
  locked: boolean;
  capacity: number;
  event_persons: unknown[];
}): RoomStatus {
  if (room.locked) return "closed";
  const count = room.event_persons.length;
  if (count > room.capacity) return "danger";
  if (count < room.capacity) return "warn";
  return "ok";
}

const STATUS_LABELS: Record<RoomStatus, string> = {
  closed: "Cerrada",
  ok: "Completa",
  danger: "Accion Requerida",
  warn: "Disponible",
};

const STATUS_COLORS: Record<RoomStatus, string> = {
  closed: "bg-gray-100 text-gray-600",
  ok: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warn: "bg-warning/10 text-warning",
};

const GENDER_OPTIONS = [
  { value: "mixed", label: "Mixta" },
  { value: "women", label: "Mujeres" },
  { value: "men", label: "Hombres" },
] as const;

const STORAGE_KEY_PREFIX = "orqestra:sections:";

function readOpenSections(eventId: string): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + eventId);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set<string>();
}

function writeOpenSections(eventId: string, sections: Set<string>) {
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + eventId,
      JSON.stringify([...sections])
    );
  } catch {}
}

export function RoomDetailPanel({
  roomId,
  eventId,
  onClose,
  onRoomUpdated,
  onPersonClick,
  onUnassign,
}: RoomDetailPanelProps) {
  const [data, setData] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(() =>
    readOpenSections(eventId)
  );

  // Local state for blur-save fields
  const [nameLocal, setNameLocal] = useState("");
  const [capacityLocal, setCapacityLocal] = useState("");
  const [lockedReasonLocal, setLockedReasonLocal] = useState("");
  const [descriptionLocal, setDescriptionLocal] = useState("");

  const toggleSection = useCallback(
    (label: string) => {
      setOpenSections((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        writeOpenSections(eventId, next);
        return next;
      });
    },
    [eventId]
  );

  useEffect(() => {
    setLoading(true);
    setConfirmDelete(false);
    getRoomDetail(roomId).then((result) => {
      setData(result);
      setNameLocal(result.display_name ?? "");
      setCapacityLocal(String(result.capacity));
      setLockedReasonLocal(result.locked_reason ?? "");
      setDescriptionLocal(result.description ?? "");
      setLoading(false);
    });
  }, [roomId]);

  const saveField = useCallback(
    async (changes: Record<string, unknown>) => {
      await updateRoomField(roomId, eventId, changes);
      onRoomUpdated();
    },
    [roomId, eventId, onRoomUpdated]
  );

  // Blur-save handlers
  const handleNameBlur = useCallback(() => {
    if (!data) return;
    const newVal = nameLocal || null;
    if (newVal === data.display_name) return;
    setData((prev) => (prev ? { ...prev, display_name: newVal } : prev));
    saveField({ display_name: newVal });
  }, [data, nameLocal, saveField]);

  const handleCapacityBlur = useCallback(() => {
    if (!data) return;
    const num = parseInt(capacityLocal, 10);
    if (isNaN(num) || num < 1) {
      setCapacityLocal(String(data.capacity));
      return;
    }
    if (num === data.capacity) return;
    setData((prev) => (prev ? { ...prev, capacity: num } : prev));
    saveField({ capacity: num });
  }, [data, capacityLocal, saveField]);

  const handleLockedReasonBlur = useCallback(() => {
    if (!data) return;
    const newVal = lockedReasonLocal || null;
    if (newVal === data.locked_reason) return;
    setData((prev) => (prev ? { ...prev, locked_reason: newVal } : prev));
    saveField({ locked_reason: newVal });
  }, [data, lockedReasonLocal, saveField]);

  const handleDescriptionBlur = useCallback(() => {
    if (!data) return;
    const newVal = descriptionLocal || null;
    if (newVal === data.description) return;
    setData((prev) => (prev ? { ...prev, description: newVal } : prev));
    saveField({ description: newVal });
  }, [data, descriptionLocal, saveField]);

  // Immediate-save handlers
  const handleBathroomToggle = useCallback(() => {
    if (!data) return;
    const newVal = !data.has_private_bathroom;
    setData((prev) =>
      prev ? { ...prev, has_private_bathroom: newVal } : prev
    );
    saveField({ has_private_bathroom: newVal });
  }, [data, saveField]);

  const handleGenderChange = useCallback(
    (value: string) => {
      if (!data || data.gender_restriction === value) return;
      setData((prev) =>
        prev ? { ...prev, gender_restriction: value } : prev
      );
      saveField({ gender_restriction: value });
    },
    [data, saveField]
  );

  const handleLockedToggle = useCallback(() => {
    if (!data) return;
    const newVal = !data.locked;
    setData((prev) => (prev ? { ...prev, locked: newVal } : prev));
    saveField({ locked: newVal });
  }, [data, saveField]);

  const handleDelete = useCallback(async () => {
    await deleteRoomAction(roomId, eventId);
    onRoomUpdated();
    onClose();
  }, [roomId, eventId, onRoomUpdated, onClose]);

  const handleUnassignFromPanel = useCallback(
    (personId: string) => {
      // Optimistically remove from local data
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          event_persons: prev.event_persons.filter((ep) => ep.id !== personId),
        };
      });
      onUnassign?.(personId);
    },
    [onUnassign]
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </aside>
    );
  }

  if (!data) return null;

  const status = deriveStatus(data);
  const assignedCount = data.event_persons.length;
  const genderLabel =
    GENDER_OPTIONS.find((o) => o.value === data.gender_restriction)?.label ??
    "Mixta";
  const personsSummary =
    assignedCount > 0
      ? `${assignedCount} de ${data.capacity}`
      : "Vacia";
  const descriptionSummary = data.description
    ? data.description.slice(0, 30) + (data.description.length > 30 ? "..." : "")
    : "Sin descripcion";

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-gray-100 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="material-symbols-outlined text-lg text-primary">
            meeting_room
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <input
            value={nameLocal}
            onChange={(e) => setNameLocal(e.target.value)}
            onBlur={handleNameBlur}
            placeholder={`Hab ${data.internal_number}`}
            className="w-full truncate text-base font-semibold text-gray-800 outline-none focus:border-b focus:border-primary"
          />
          <p className="text-xs text-gray-400">#{data.internal_number}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Status badge */}
      <div className="px-4 pt-3 pb-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            STATUS_COLORS[status]
          )}
        >
          {status === "closed" && (
            <span className="material-symbols-outlined text-sm">lock</span>
          )}
          {status === "danger" && (
            <span className="material-symbols-outlined text-sm">warning</span>
          )}
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="flex-1 divide-y divide-gray-100 px-4">
        {/* Capacity */}
        <CollapsibleSection
          label="Capacidad"
          summary={`${assignedCount} / ${data.capacity}`}
          open={openSections.has("Capacidad")}
          onToggle={() => toggleSection("Capacidad")}
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={capacityLocal}
              onChange={(e) => setCapacityLocal(e.target.value)}
              onBlur={handleCapacityBlur}
              className="w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <span className="text-xs text-gray-400">
              {assignedCount} de {data.capacity} ocupados
            </span>
          </div>
        </CollapsibleSection>

        {/* Toggles: bathroom, gender, locked */}
        <CollapsibleSection
          label="Configuracion"
          summary={[
            data.has_private_bathroom ? "Baño priv." : null,
            data.gender_restriction !== "mixed" ? genderLabel : null,
            data.locked ? "Cerrada" : null,
          ]
            .filter(Boolean)
            .join(", ") || "Estandar"}
          open={openSections.has("Configuracion")}
          onToggle={() => toggleSection("Configuracion")}
        >
          <div className="space-y-3">
            {/* Bathroom */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Baño privado</span>
              <ToggleSwitch
                checked={data.has_private_bathroom}
                onChange={handleBathroomToggle}
              />
            </div>

            {/* Gender restriction */}
            <div>
              <span className="text-sm text-gray-600">
                Restriccion de genero
              </span>
              <div className="mt-1.5 flex rounded-lg border border-gray-200 p-0.5">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleGenderChange(opt.value)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      data.gender_restriction === opt.value
                        ? "bg-primary text-white"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Locked */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cerrada</span>
              <ToggleSwitch
                checked={data.locked}
                onChange={handleLockedToggle}
              />
            </div>

            {/* Locked reason (conditional) */}
            {data.locked && (
              <input
                value={lockedReasonLocal}
                onChange={(e) => setLockedReasonLocal(e.target.value)}
                onBlur={handleLockedReasonBlur}
                placeholder="Motivo de cierre"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
            )}
          </div>
        </CollapsibleSection>

        {/* Assigned persons */}
        <CollapsibleSection
          label="Personas asignadas"
          summary={personsSummary}
          open={openSections.has("Personas asignadas")}
          onToggle={() => toggleSection("Personas asignadas")}
        >
          {data.event_persons.length === 0 ? (
            <p className="text-xs text-gray-400">Sin personas asignadas</p>
          ) : (
            <div className="space-y-1">
              {data.event_persons.map((ep) => (
                <div
                  key={ep.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                >
                  <button
                    onClick={() => onPersonClick?.(ep.id)}
                    className="flex flex-1 items-center gap-2 min-w-0"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {ep.person.name_initials}
                    </div>
                    <span className="truncate text-sm text-gray-700">
                      {ep.person.name_display}
                    </span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
                      {ep.role === "facilitator" ? "fac" : "par"}
                    </span>
                  </button>
                  {onUnassign && (
                    <button
                      onClick={() => handleUnassignFromPanel(ep.id)}
                      className="hidden h-5 w-5 items-center justify-center rounded text-gray-300 hover:bg-gray-200 hover:text-gray-600 group-hover:flex"
                    >
                      <span className="material-symbols-outlined text-sm">
                        close
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Description */}
        <CollapsibleSection
          label="Descripcion"
          summary={descriptionSummary}
          open={openSections.has("Descripcion")}
          onToggle={() => toggleSection("Descripcion")}
        >
          <textarea
            value={descriptionLocal}
            onChange={(e) => setDescriptionLocal(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Sin descripcion"
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </CollapsibleSection>
      </div>

      {/* Footer — Delete */}
      <div className="border-t border-gray-100 p-4">
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Se eliminara esta habitacion y se desasignaran todas las personas.
              Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90"
              >
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5"
          >
            Eliminar Habitacion
          </button>
        )}
      </div>
    </aside>
  );
}

function CollapsibleSection({
  label,
  summary,
  children,
  open,
  onToggle,
}: {
  label: string;
  summary: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
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
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span className="flex-1" />
        <span className="truncate text-xs text-gray-500 max-w-[140px] text-right">
          {summary}
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        checked ? "bg-success" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}
