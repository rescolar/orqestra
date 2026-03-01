"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventDetails } from "@/lib/actions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, DoorOpen, Users, Calendar, ImageIcon } from "lucide-react";
import Link from "next/link";

interface EventDetailFormProps {
  event: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    image_url: string | null;
    date_start: string;
    date_end: string;
    estimated_participants: number;
    roomCount: number;
  };
}

export function EventDetailForm({ event }: EventDetailFormProps) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [imageUrl, setImageUrl] = useState(event.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    name !== event.name ||
    description !== (event.description ?? "") ||
    location !== (event.location ?? "") ||
    imageUrl !== (event.image_url ?? "");

  const dateOpts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const dateStart = new Date(event.date_start).toLocaleDateString("es-ES", dateOpts);
  const dateEnd = new Date(event.date_end).toLocaleDateString("es-ES", dateOpts);

  async function handleSaveAndGo() {
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (isDirty) {
        await updateEventDetails(event.id, {
          name: name.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          image_url: imageUrl.trim() || null,
        });
      }
      router.push(`/events/${event.id}/board`);
    } catch (e) {
      if (e instanceof Error && "digest" in e) throw e;
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Image URL + Preview */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image_url">Imagen del evento (URL)</Label>
            <Input
              id="image_url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {imageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl.trim()}
                alt="Vista previa"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`flex flex-col items-center gap-2 text-gray-400 ${imageUrl.trim() ? "hidden" : ""}`}>
              <ImageIcon className="size-10" />
              <span className="text-sm">Sin imagen</span>
            </div>
          </div>
        </div>
      </div>

      {/* Name + Details */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del evento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu evento..."
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Casa de retiro, dirección..."
            />
          </div>
        </div>
      </div>

      {/* Read-only summary */}
      <div className="rounded-xl bg-slate-50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Resumen
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="size-4 text-gray-400" />
            <span>{dateStart} – {dateEnd}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <DoorOpen className="size-4 text-gray-400" />
            <span>{event.roomCount} habitaciones</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="size-4 text-gray-400" />
            <span>{event.estimated_participants} participantes est.</span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href={`/events/${event.id}/setup`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Link>
        <div className="flex gap-3">
          {!isDirty && (
            <Link href={`/events/${event.id}/board`}>
              <Button variant="outline">Ir al tablero</Button>
            </Link>
          )}
          {isDirty && (
            <Button onClick={handleSaveAndGo} disabled={saving}>
              {saving ? "Guardando..." : "Guardar e ir al tablero"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
