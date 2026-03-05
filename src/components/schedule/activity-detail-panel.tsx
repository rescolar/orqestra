"use client";

import { useDraggable } from "@dnd-kit/core";

type PersonItem = {
  id: string;
  name_display: string;
  name_initials: string;
};

type ActivityDetailPanelProps = {
  activityTitle: string;
  assigned: PersonItem[];
  onUnassign: (eventPersonId: string) => void;
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
  activityTitle,
  assigned,
  onUnassign,
  onClose,
}: ActivityDetailPanelProps) {
  return (
    <aside className="flex w-96 shrink-0 flex-col border-l bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="truncate text-sm font-semibold text-gray-900">
          {activityTitle}
        </h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
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
                onRemove={() => onUnassign(person.id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
