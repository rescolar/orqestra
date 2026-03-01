"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteEvent } from "@/lib/actions/event";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface EventCardProps {
  id: string;
  name: string;
  dateRange: string;
  assignedCount: number;
  estimatedParticipants: number;
  status: string;
}

export function EventCard({
  id,
  name,
  dateRange,
  assignedCount,
  estimatedParticipants,
  status,
}: EventCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteEvent(id);
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <div className="group relative flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setConfirmOpen(true);
          }}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          aria-label="Eliminar evento"
        >
          <Trash2 className="size-4" />
        </button>
        <Link href={`/events/${id}/board`} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2 pr-8">
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary">
              {name}
            </h2>
            {status !== "active" && (
              <Badge variant="secondary" className="capitalize">
                {status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">{dateRange}</p>
          <div className="mt-auto pt-2">
            <Badge variant="outline">
              {assignedCount}/{estimatedParticipants} asignados
            </Badge>
          </div>
        </Link>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="bg-white sm:max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Eliminar evento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar{" "}
              <span className="font-semibold text-gray-900">{name}</span>? Se
              borrarán todas las habitaciones y asignaciones. Esta acción no se
              puede deshacer.
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
