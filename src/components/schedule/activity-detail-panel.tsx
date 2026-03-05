"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { InlineEdit } from "./inline-edit";

type PersonItem = {
  id: string;
  name_display: string;
  name_initials: string;
};

type ActivityData = {
  id: string;
  title: string;
  description: string | null;
  max_participants: number | null;
  closed: boolean;
};

type ActivityDetailPanelProps = {
  activity: ActivityData;
  assigned?: PersonItem[];
  showAssigned?: boolean;
  isParallel?: boolean;
  onUpdate: (activityId: string, data: { title?: string; description?: string | null; max_participants?: number | null; closed?: boolean }) => void;
  onUnassign?: (eventPersonId: string) => void;
  onClose: () => void;
};

function DraggableChip({
  person,
  onRemove,
}: {
  person: PersonItem;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `assigned-${person.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex h-8 items-center gap-2 rounded-full bg-gray-100 pl-1 pr-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
        {person.name_initials}
      </div>
      <span className="truncate text-xs font-medium text-gray-700">
        {person.name_display}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-auto shrink-0 rounded-full p-0.5 text-gray-400 hover:text-danger"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
}

export function ActivityDetailPanel({
  activity,
  assigned = [],
  showAssigned = false,
  isParallel = true,
  onUpdate,
  onUnassign,
  onClose,
}: ActivityDetailPanelProps) {
  const [maxParticipants, setMaxParticipants] = useState(
    activity.max_participants?.toString() ?? ""
  );

  const isOverCapacity =
    activity.max_participants != null &&
    assigned.length > activity.max_participants;

  const handleMaxParticipantsBlur = () => {
    const parsed = maxParticipants === "" ? null : parseInt(maxParticipants, 10);
    const newVal = parsed != null && !isNaN(parsed) && parsed > 0 ? parsed : null;
    if (newVal !== activity.max_participants) {
      onUpdate(activity.id, { max_participants: newVal });
    }
    setMaxParticipants(newVal?.toString() ?? "");
  };

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={activity.title}
            onSave={(title) => onUpdate(activity.id, { title })}
            placeholder="Título de la actividad"
            className="truncate text-sm font-semibold text-gray-900"
          />
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded p-1 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Description */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-gray-500">
            Descripción
          </p>
          <InlineEdit
            value={activity.description ?? ""}
            onSave={(description) =>
              onUpdate(activity.id, { description: description || null })
            }
            placeholder="Añadir descripción..."
            multiline
            className="text-sm text-gray-600"
          />
        </div>

        {/* Settings (parallel only) */}
        {isParallel && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase text-gray-500">
              Configuración
            </p>
            <div className="flex items-center justify-between">
              <label
                htmlFor="max-participants"
                className="text-sm text-gray-700"
              >
                Aforo máximo
              </label>
              <input
                id="max-participants"
                type="number"
                min={1}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                onBlur={handleMaxParticipantsBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                placeholder="Sin límite"
                className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Cerrada</span>
              <button
                type="button"
                role="switch"
                aria-checked={activity.closed}
                onClick={() => onUpdate(activity.id, { closed: !activity.closed })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  activity.closed ? "bg-danger" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                    activity.closed ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Capacity indicator (only when showAssigned) */}
        {showAssigned && activity.max_participants != null && (
          <p
            className={`text-sm font-medium ${
              isOverCapacity ? "text-danger" : "text-gray-600"
            }`}
          >
            <span className="material-symbols-outlined mr-1 align-middle text-base">
              {isOverCapacity ? "warning" : "group"}
            </span>
            {assigned.length}/{activity.max_participants} asignados
          </p>
        )}

        {/* Assigned list (parallel only) */}
        {showAssigned && (
          <>
            <hr className="border-gray-100" />
            <div>
              <p className="mb-3 text-xs font-medium uppercase text-gray-500">
                Asignados ({assigned.length})
              </p>
              {assigned.length === 0 ? (
                <p className="text-center text-xs text-gray-400">
                  Haz clic en una persona o arrastra aquí
                </p>
              ) : (
                <div className="space-y-1.5">
                  {assigned.map((person) => (
                    <DraggableChip
                      key={person.id}
                      person={person}
                      onRemove={() => onUnassign?.(person.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
