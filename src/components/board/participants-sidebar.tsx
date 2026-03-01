"use client";

import { useState, useTransition, useMemo } from "react";
import {
  seedTestParticipants,
  getUnassignedPersons,
} from "@/lib/actions/person";

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

export function ParticipantsSidebar({
  eventId,
  initialPersons,
}: {
  eventId: string;
  initialPersons: UnassignedPerson[];
}) {
  const [persons, setPersons] = useState(initialPersons);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return persons;
    const q = search.toLowerCase();
    return persons.filter((p) =>
      p.person.name_full.toLowerCase().includes(q)
    );
  }, [persons, search]);

  function handleSeed() {
    startTransition(async () => {
      await seedTestParticipants(eventId);
      const updated = await getUnassignedPersons(eventId);
      setPersons(updated);
    });
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Participantes
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          {persons.length} sin asignar
        </p>
      </div>

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

      {persons.length > 0 && (
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
              className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.map((ep) => (
          <li
            key={ep.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
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
        ))}
      </ul>
    </aside>
  );
}
