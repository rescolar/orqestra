"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, Pencil, MapPin, Calendar } from "lucide-react";
import { InviteLinkButton } from "@/components/event/invite-link-button";
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
  imageUrl?: string | null;
  location?: string | null;
  totalCapacity: number;
  pendingCount: number;
  isCollaborator?: boolean;
}

export function EventCard({
  id,
  name,
  dateRange,
  assignedCount,
  status,
  imageUrl,
  location,
  totalCapacity,
  pendingCount,
  isCollaborator,
}: EventCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteEvent(id);
      setConfirmOpen(false);
    });
  }

  const capacityPct = totalCapacity > 0 ? Math.min((assignedCount / totalCapacity) * 100, 100) : 0;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div className="group relative flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* Actions */}
        <div className="absolute top-3 right-3 z-10 flex gap-1">
          {!isCollaborator && <InviteLinkButton eventId={id} />}
          <Link
            href={`/events/${id}/detail`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg bg-white/90 p-1.5 text-gray-400 shadow-sm hover:bg-white hover:text-gray-600"
            aria-label="Editar evento"
          >
            <Pencil className="size-4" />
          </Link>
          {!isCollaborator && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
              className="rounded-lg bg-white/90 p-1.5 text-gray-400 shadow-sm hover:bg-white hover:text-red-600"
              aria-label="Eliminar evento"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        <Link href={`/events/${id}/board`} className="flex min-w-0 flex-1 gap-4 p-4">
          {/* Thumbnail */}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="size-[90px] shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex size-[90px] shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="text-xl font-bold">{initials}</span>
            </div>
          )}

          {/* Content */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {/* Top row: name + pending badge */}
            <div className="flex items-start justify-between gap-2 pr-16">
              <h2 className="truncate text-base font-semibold text-gray-900 group-hover:text-primary">
                {name}
              </h2>
              <div className="flex shrink-0 gap-1">
                {isCollaborator && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    Co-org
                  </Badge>
                )}
                {status !== "active" && (
                  <Badge variant="secondary" className="capitalize">
                    {status === "draft" ? "borrador" : status === "archived" ? "archivado" : status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Date + location */}
            <div className="flex min-w-0 items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex shrink-0 items-center gap-1">
                <Calendar className="size-3.5" />
                {dateRange}
              </span>
              {location && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{location}</span>
                </span>
              )}
            </div>

            {/* Capacity bar + pending badge */}
            <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-1">
              {totalCapacity > 0 ? (
                <div className="min-w-0 flex-1 basis-24">
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="text-gray-500">Capacidad</span>
                    <span className="font-medium text-gray-700">
                      {assignedCount}/{totalCapacity}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${capacityPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-gray-400">Sin habitaciones</span>
              )}

              {pendingCount > 0 ? (
                <Badge className="shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
                  {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
                </Badge>
              ) : (
                <Badge className="shrink-0 bg-gray-100 text-gray-500 hover:bg-gray-100">
                  Al día
                </Badge>
              )}
            </div>
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
