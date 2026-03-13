"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, Pencil, MapPin, DoorOpen, Plus } from "lucide-react";
import { deleteVenue } from "@/lib/actions/venue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface VenueCardProps {
  id: string;
  name: string;
  location?: string | null;
  roomCount: number;
}

export function VenueCard({ id, name, location, roomCount }: VenueCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleDelete() {
    startTransition(async () => {
      await deleteVenue(id);
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <div className="group relative flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* Hover actions */}
        <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Link
            href={`/events/new?venue=${id}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg bg-white/90 p-1.5 text-gray-400 shadow-sm hover:bg-white hover:text-primary"
            aria-label="Crear evento desde este centro"
            title="Crear evento"
          >
            <Plus className="size-4" />
          </Link>
          <Link
            href={`/venues/${id}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg bg-white/90 p-1.5 text-gray-400 shadow-sm hover:bg-white hover:text-gray-600"
            aria-label="Editar centro"
          >
            <Pencil className="size-4" />
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
            className="rounded-lg bg-white/90 p-1.5 text-gray-400 shadow-sm hover:bg-white hover:text-red-600"
            aria-label="Eliminar centro"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <Link href={`/venues/${id}`} className="flex min-w-0 flex-1 gap-4 p-4">
          {/* Icon */}
          <div className="flex size-[72px] shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-bold">{initials}</span>
          </div>

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="truncate pr-16 text-base font-semibold text-gray-900 group-hover:text-primary">
              {name}
            </h2>
            {location && (
              <span className="inline-flex min-w-0 items-center gap-1 text-xs text-gray-500">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </span>
            )}
            <span className="mt-auto inline-flex items-center gap-1 text-xs text-gray-500">
              <DoorOpen className="size-3.5" />
              {roomCount} {roomCount === 1 ? "habitación" : "habitaciones"}
            </span>
          </div>
        </Link>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="bg-white sm:max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Eliminar centro</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar{" "}
              <span className="font-semibold text-gray-900">{name}</span>? Se
              borrarán todas las habitaciones de la plantilla. Los eventos
              creados desde este centro no se verán afectados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
