"use client";

import { useState } from "react";
import { createRoom } from "@/lib/actions/room";
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

export function CreateRoomDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await createRoom(eventId, formData);
      setOpen(false);
    } catch (e) {
      if (e instanceof Error && "digest" in e) throw e;
      setError(e instanceof Error ? e.message : "Error al crear la habitación");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-gray-400 transition-colors hover:border-primary/50 hover:text-primary">
          <span className="material-symbols-outlined text-3xl">add</span>
          <span className="text-sm font-medium">Nueva Habitación</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="bg-white"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nueva habitación</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Nombre (opcional)</Label>
            <Input
              id="display_name"
              name="display_name"
              placeholder="Ej: Suite Principal"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                defaultValue={2}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender_restriction">Restricción género</Label>
              <select
                id="gender_restriction"
                name="gender_restriction"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                defaultValue="mixed"
              >
                <option value="mixed">Mixta</option>
                <option value="women">Solo mujeres</option>
                <option value="men">Solo hombres</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="has_private_bathroom"
              name="has_private_bathroom"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="has_private_bathroom">Baño privado</Label>
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
              {pending ? "Creando..." : "Crear habitación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
