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
  person: {
    name_full: string;
    name_display: string;
    name_initials: string;
    gender: string;
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

type RoleTab = "all" | "participant" | "facilitator";

export function ParticipantsSidebar({
  eventId,
  persons,
  allPersons,
  onPersonsChange,
}: {
  eventId: string;
  persons: UnassignedPerson[];
  allPersons: SidebarPerson[];
  onPersonsChange?: (persons: UnassignedPerson[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<RoleTab>("all");
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

  // Unassigned list filtered by active tab
  const filteredUnassigned = useMemo(() => {
    let list = persons;
    if (activeTab !== "all") {
      list = list.filter((p) => p.role === activeTab);
    }
    return list;
  }, [persons, activeTab]);

  // Search results from ALL persons
  const searchResults = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    return allPersons.filter((p) =>
      p.person.name_full.toLowerCase().includes(q)
    );
  }, [search, allPersons]);

  function handleSeed() {
    startTransition(async () => {
      await seedTestParticipants(eventId);
      const updated = await getUnassignedPersons(eventId);
      onPersonsChange?.(updated);
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

  const tabs: { key: RoleTab; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "participant", label: "Participantes" },
    { key: "facilitator", label: "Facilitadores" },
  ];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Participantes
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            {persons.length} sin asignar
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setBatchText("");
            setBatchError(null);
          }
        }}>
          <DialogTrigger asChild>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary">
              <span className="material-symbols-outlined text-lg">person_add</span>
            </button>
          </DialogTrigger>
          <DialogContent
            className="bg-white sm:max-w-[400px]"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Añadir participantes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nombres (uno por línea)
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={"María García\nCarlos López\nAna Martínez"}
                  rows={8}
                  autoFocus
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              {parsedNames.length > 0 && (
                <p className="text-sm text-gray-500">
                  Se crearán <span className="font-medium text-gray-700">{parsedNames.length}</span> participante{parsedNames.length !== 1 ? "s" : ""}
                </p>
              )}
              {batchError && <p className="text-sm text-red-600">{batchError}</p>}
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
                  {batchPending ? "Creando…" : "Añadir"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 border-b border-gray-100 px-3 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary/10 text-primary"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Seed button */}
      {persons.length === 0 && (
        <div className="p-4">
          <button
            onClick={handleSeed}
            disabled={isPending}
            className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {isPending ? "Creando…" : "Añadir 20 de prueba"}
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
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-8 text-sm outline-none focus:border-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Content: search results OR unassigned list */}
      {searchResults ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Resultados ({searchResults.length})
            </span>
          </div>
          <ul className="px-2 pb-2">
            {searchResults.length === 0 && (
              <li className="px-2 py-4 text-center text-xs text-gray-400">
                Sin resultados
              </li>
            )}
            {searchResults.map((sp) => (
              <DraggableSearchItem key={sp.id} sp={sp} />
            ))}
          </ul>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto px-2 py-2">
          {filteredUnassigned.map((ep) => (
            <DraggablePersonItem key={ep.id} ep={ep} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function DraggablePersonItem({ ep }: { ep: UnassignedPerson }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: ep.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 ${
        isDragging ? "opacity-30" : ""
      }`}
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
    </li>
  );
}

function DraggableSearchItem({ sp }: { sp: SidebarPerson }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: sp.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
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
        <span className="truncate text-[10px] text-gray-400">
          {sp.roomName ?? "Sin asignar"}
        </span>
      </div>
      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
        {sp.role === "facilitator" ? "fac" : "par"}
      </span>
    </li>
  );
}
