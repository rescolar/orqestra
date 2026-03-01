"use client";

import { useState, useTransition, useMemo } from "react";
import {
  seedTestParticipants,
  getUnassignedPersons,
  createParticipant,
} from "@/lib/actions/person";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formPending, setFormPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  async function handleCreate(formData: FormData) {
    setFormError(null);
    setFormPending(true);
    try {
      const name_full = (formData.get("name_full") as string)?.trim();
      if (!name_full) {
        setFormError("El nombre es obligatorio");
        setFormPending(false);
        return;
      }
      const gender = (formData.get("gender") as string) || "unknown";
      const role = (formData.get("role") as string) || "participant";
      await createParticipant(eventId, {
        name_full,
        gender: gender as "unknown" | "female" | "male" | "other",
        role: role as "participant" | "facilitator",
      });
      const updated = await getUnassignedPersons(eventId);
      setPersons(updated);
      setDialogOpen(false);
    } catch (e) {
      if (e instanceof Error && "digest" in e) throw e;
      setFormError(e instanceof Error ? e.message : "Error al crear participante");
    } finally {
      setFormPending(false);
    }
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Participantes
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            {persons.length} sin asignar
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <DialogTitle>Añadir participante</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name_full">Nombre completo</Label>
                <Input
                  id="name_full"
                  name="name_full"
                  placeholder="Ej: María García López"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  <select
                    id="gender"
                    name="gender"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    defaultValue="unknown"
                  >
                    <option value="unknown">No indicado</option>
                    <option value="female">Mujer</option>
                    <option value="male">Hombre</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <select
                    id="role"
                    name="role"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    defaultValue="participant"
                  >
                    <option value="participant">Participante</option>
                    <option value="facilitator">Facilitador</option>
                  </select>
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={formPending}>
                  {formPending ? "Creando…" : "Añadir"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
