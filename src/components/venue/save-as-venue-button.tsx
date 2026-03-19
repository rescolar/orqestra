"use client";

import { useState, useTransition } from "react";
import { Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveEventAsVenue } from "@/lib/actions/venue";

export function SaveAsVenueButton({
  eventId,
  variant = "outline",
}: {
  eventId: string;
  variant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    if (!name.trim()) return;

    startTransition(async () => {
      await saveEventAsVenue(eventId, name.trim());
      setOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  if (saved) {
    return (
      <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
        <Check className="size-4" />
        Centro guardado
      </span>
    );
  }

  return (
    <>
      {variant === "outline" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary hover:bg-primary/10"
        >
          <Building2 className="size-4" />
          Guardar como centro
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Building2 className="mr-1.5 size-4" />
          Guardar como centro
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Guardar como centro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Se creará un centro con las habitaciones actuales de este evento como
            plantilla reutilizable.
          </p>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue-save-name">Nombre del centro</Label>
              <Input
                id="venue-save-name"
                name="name"
                placeholder="Casa de retiro San Juan"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
