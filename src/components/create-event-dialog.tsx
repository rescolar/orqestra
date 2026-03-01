"use client";

import { useState } from "react";
import { createEvent } from "@/lib/actions/event";
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
import { Plus } from "lucide-react";

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await createEvent(formData);
    } catch (e) {
      // Next.js redirect() throws an error with a NEXT_REDIRECT digest — re-throw it
      if (e instanceof Error && "digest" in e) throw e;
      setError(e instanceof Error ? e.message : "Error al crear el evento");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-gray-500 transition-colors hover:border-primary hover:text-primary">
          <Plus className="size-8" />
          <span className="text-sm font-medium">Nuevo Evento</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear nuevo evento</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del evento</Label>
            <Input
              id="name"
              name="name"
              placeholder="Retiro Primavera 2026"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_start">Fecha inicio</Label>
              <Input
                id="date_start"
                name="date_start"
                type="date"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_end">Fecha fin</Label>
              <Input id="date_end" name="date_end" type="date" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_participants">
              Participantes estimados
            </Label>
            <Input
              id="estimated_participants"
              name="estimated_participants"
              type="number"
              min={1}
              placeholder="30"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando..." : "Crear evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
