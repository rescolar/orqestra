"use client";

import { useState, useTransition, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  seedTestParticipants,
  getUnassignedPersons,
  createParticipantsBatch,
} from "@/lib/actions/person";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type UnassignedPerson = {
  id: string;
  role: string;
  status: string;
  companion_id: string | null;
  dietary_notified: boolean;
  requests_text: string | null;
  requests_managed: boolean;
  accommodation_room_type_id: string | null;
  auto_assigned: boolean;
  auto_assign_managed: boolean;
  person: {
    name_full: string;
    name_display: string;
    name_initials: string;
    gender: string;
    dietary_requirements: string[];
    allergies_text: string | null;
  };
};

export type SidebarPerson = {
  id: string;
  role: string;
  roomName: string | null;
  person: {
    name_full: string;
    name_display: string;
    name_initials: string;
    gender: string;
  };
};

export type DirectoryPerson = {
  id: string;
  name_full: string;
  name_display: string;
  name_initials: string;
  gender: string;
  default_role: string;
  eventPerson: {
    id: string;
    role: string;
    roomName: string | null;
  } | null;
};

type ScopeTab = "todos" | "evento";
type RoleTab = "all" | "participant" | "facilitator";

export function ParticipantsSidebar({
  eventId,
  persons,
  allEventPersons,
  directoryPersons,
  onPersonsChange,
  onPersonClick,
  onLoadDirectory,
  onAddToEvent,
  onRemoveFromEvent,
  onAddAllToEvent,
}: {
  eventId: string;
  persons: UnassignedPerson[];
  allEventPersons: SidebarPerson[];
  directoryPersons: DirectoryPerson[];
  onPersonsChange?: (persons: UnassignedPerson[]) => void;
  onPersonClick?: (personId: string) => void;
  onLoadDirectory?: () => void;
  onAddToEvent?: (personId: string) => void;
  onRemoveFromEvent?: (eventPersonId: string) => void;
  onAddAllToEvent?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<ScopeTab>("evento");
  const [roleFilter, setRoleFilter] = useState<RoleTab>("all");
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchPending, setBatchPending] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const parsedNames = useMemo(() => {
    return batchText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }, [batchText]);

  // Filtered list for "Evento" scope — all event persons with role filter + search
  const filteredEventPersons = useMemo(() => {
    let list = allEventPersons;
    if (roleFilter !== "all") {
      list = list.filter((p) => p.role === roleFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.person.name_full.toLowerCase().includes(q));
    }
    return list;
  }, [allEventPersons, roleFilter, search]);

  // Filtered list for "Todos" scope — directory persons with role filter + search
  const filteredDirectoryPersons = useMemo(() => {
    let list = directoryPersons;
    if (roleFilter !== "all") {
      list = list.filter((p) => p.default_role === roleFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name_full.toLowerCase().includes(q));
    }
    return list;
  }, [directoryPersons, roleFilter, search]);

  function handleSeed() {
    startTransition(async () => {
      await seedTestParticipants(eventId);
      const updated = await getUnassignedPersons(eventId);
      onPersonsChange?.(updated);
      onLoadDirectory?.();
    });
  }

  async function handleBatchCreate() {
    if (parsedNames.length === 0) return;
    setBatchError(null);
    setBatchPending(true);
    try {
      await createParticipantsBatch(eventId, parsedNames);
      const updated = await getUnassignedPersons(eventId);
      onPersonsChange?.(updated);
      setBatchText("");
      setDialogOpen(false);
    } catch (e) {
      if (e instanceof Error && "digest" in e) throw e;
      setBatchError(
        e instanceof Error ? e.message : "Error al crear participantes"
      );
    } finally {
      setBatchPending(false);
    }
  }

  function handleScopeChange(newScope: ScopeTab) {
    setScope(newScope);
    if (newScope === "todos" && directoryPersons.length === 0) {
      onLoadDirectory?.();
    }
  }

  const roleTabs: { key: RoleTab; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "participant", label: "Participantes" },
    { key: "facilitator", label: "Facilitadores" },
  ];

  const eventPersonCount = allEventPersons.length;
  const unassignedCount = persons.length;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Participantes
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            {scope === "evento"
              ? `${eventPersonCount} en evento · ${unassignedCount} sin asignar`
              : `${directoryPersons.length} personas`}
          </p>
        </div>
        {scope === "todos" && directoryPersons.some((dp) => !dp.eventPerson) && (
          <button
            onClick={() => onAddAllToEvent?.()}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary"
            title="Agregar todos al evento"
          >
            <span className="material-symbols-outlined text-lg">
              group_add
            </span>
          </button>
        )}
        {scope === "evento" && (
          <div className="flex gap-1">
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setBatchText("");
                  setBatchError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <button className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary">
                  <span className="material-symbols-outlined text-lg">
                    person_add
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent
                className="bg-white sm:max-w-[400px]"
                onInteractOutside={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Anadir participantes</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nombres (uno por linea)
                    </label>
                    <textarea
                      value={batchText}
                      onChange={(e) => setBatchText(e.target.value)}
                      placeholder={"Maria Garcia\nCarlos Lopez\nAna Martinez"}
                      rows={8}
                      autoFocus
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  {parsedNames.length > 0 && (
                    <p className="text-sm text-gray-500">
                      Se crearan{" "}
                      <span className="font-medium text-gray-700">
                        {parsedNames.length}
                      </span>{" "}
                      participante{parsedNames.length !== 1 ? "s" : ""}
                    </p>
                  )}
                  {batchError && (
                    <p className="text-sm text-red-600">{batchError}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleBatchCreate}
                      disabled={batchPending || parsedNames.length === 0}
                    >
                      {batchPending ? "Creando..." : "Anadir"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Scope toggle */}
      <div className="flex gap-1 border-b border-gray-100 px-3 py-2">
        <button
          onClick={() => handleScopeChange("evento")}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            scope === "evento"
              ? "bg-primary/10 text-primary"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Evento
        </button>
        <button
          onClick={() => handleScopeChange("todos")}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            scope === "todos"
              ? "bg-primary/10 text-primary"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Todos
        </button>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 border-b border-gray-100 px-3 py-2">
        {roleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRoleFilter(tab.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              roleFilter === tab.key
                ? "bg-primary/10 text-primary"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Seed button — only in "Evento" scope when empty */}
      {scope === "evento" && allEventPersons.length === 0 && directoryPersons.length === 0 && (
        <div className="p-4">
          <button
            onClick={handleSeed}
            disabled={isPending}
            className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {isPending ? "Creando..." : "Anadir 20 de prueba"}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-base text-gray-400">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-8 text-sm outline-none focus:border-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-base">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {scope === "evento" ? (
        <ul className="flex-1 overflow-y-auto px-2 py-2">
          {filteredEventPersons.length === 0 && (
            <li className="px-2 py-4 text-center text-xs text-gray-400">
              Sin resultados
            </li>
          )}
          {filteredEventPersons.map((sp) => (
            <DraggableEventItem
              key={sp.id}
              sp={sp}
              onPersonClick={onPersonClick}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex-1 overflow-y-auto px-2 py-2">
          {filteredDirectoryPersons.length === 0 && (
            <li className="px-2 py-4 text-center text-xs text-gray-400">
              Sin resultados
            </li>
          )}
          {filteredDirectoryPersons.map((dp) => (
            <DraggableDirectoryItem
              key={dp.id}
              dp={dp}
              onPersonClick={onPersonClick}
              onAddToEvent={onAddToEvent}
              onRemoveFromEvent={onRemoveFromEvent}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}

function DraggableEventItem({
  sp,
  onPersonClick,
}: {
  sp: SidebarPerson;
  onPersonClick?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `sidebar-${sp.id}` });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={() => onPersonClick?.(sp.id)}
      className={`flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
        {sp.person.name_initials}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-gray-700">
          {sp.person.name_display}
        </span>
        {sp.roomName && (
          <span className="truncate text-[10px] text-gray-400">
            {sp.roomName}
          </span>
        )}
        {!sp.roomName && (
          <span className="truncate text-[10px] text-gray-400">
            Sin asignar
          </span>
        )}
      </div>
      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
        {sp.role === "facilitator" ? "fac" : "par"}
      </span>
    </li>
  );
}

function DraggableDirectoryItem({
  dp,
  onPersonClick,
  onAddToEvent,
  onRemoveFromEvent,
}: {
  dp: DirectoryPerson;
  onPersonClick?: (id: string) => void;
  onAddToEvent?: (personId: string) => void;
  onRemoveFromEvent?: (eventPersonId: string) => void;
}) {
  // Use "person-{Person.id}" prefix to distinguish from EventPerson IDs
  const draggableId = `person-${dp.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: draggableId });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const inEvent = dp.eventPerson !== null;

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={() => {
        if (dp.eventPerson) onPersonClick?.(dp.eventPerson.id);
      }}
      className={`flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
          inEvent
            ? "bg-primary/10 text-primary"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {dp.name_initials}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-gray-700">
          {dp.name_display}
        </span>
        {inEvent && (
          <span className="truncate text-[10px] text-emerald-600">
            {dp.eventPerson!.roomName ?? "En evento"}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (inEvent && dp.eventPerson) {
            onRemoveFromEvent?.(dp.eventPerson.id);
          } else {
            onAddToEvent?.(dp.id);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`shrink-0 rounded-full p-0.5 transition-colors ${
          inEvent
            ? "text-primary hover:text-danger"
            : "text-gray-300 hover:text-primary"
        }`}
        title={inEvent ? "Quitar del evento" : "Agregar al evento"}
      >
        <span className="material-symbols-outlined text-base">
          {inEvent ? "check_circle" : "add_circle"}
        </span>
      </button>
      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
        {dp.default_role === "facilitator" ? "fac" : "par"}
      </span>
    </li>
  );
}
