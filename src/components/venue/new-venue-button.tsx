"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createVenue } from "@/lib/actions/venue";

export function NewVenueButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const location = (formData.get("location") as string) || null;
    if (!name.trim()) return;

    startTransition(async () => {
      const venue = await createVenue({ name: name.trim(), location });
      setOpen(false);
      router.push(`/venues/${venue.id}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 size-4" />
        Nuevo centro
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo centro</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue-name">Nombre</Label>
              <Input
                id="venue-name"
                name="name"
                placeholder="Casa de retiro San Juan"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue-location">Ubicación</Label>
              <Input
                id="venue-location"
                name="location"
                placeholder="Sierra de Guadarrama, Madrid"
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
                {isPending ? "Creando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
