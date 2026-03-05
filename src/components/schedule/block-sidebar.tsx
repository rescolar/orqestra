"use client";

import { useDraggable } from "@dnd-kit/core";

type PersonItem = {
  id: string;
  name_display: string;
  name_initials: string;
};

type BlockSidebarProps = {
  unassigned: PersonItem[];
  blockLabel: string;
  onPersonClick: (eventPersonId: string) => void;
};

function DraggablePersonItem({
  person,
  onClick,
}: {
  person: PersonItem;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unassigned-${person.id}`,
  });

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-50 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
        {person.name_initials}
      </div>
      <span className="truncate text-sm text-gray-700">
        {person.name_display}
      </span>
    </button>
  );
}

export function BlockSidebar({
  unassigned,
  blockLabel,
  onPersonClick,
}: BlockSidebarProps) {
  return (
    <aside className="flex w-[264px] shrink-0 flex-col border-r bg-white">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Sin asignar ({unassigned.length})
        </h3>
        <p className="mt-0.5 truncate text-xs text-gray-500">{blockLabel}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {unassigned.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-gray-400">
            Todos asignados
          </p>
        ) : (
          unassigned.map((person) => (
            <DraggablePersonItem
              key={person.id}
              person={person}
              onClick={() => onPersonClick(person.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
