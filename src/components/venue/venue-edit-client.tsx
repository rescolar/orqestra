"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RoomSetupForm } from "@/components/room-setup-form";
import { updateVenue } from "@/lib/actions/venue";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

interface VenueEditClientProps {
  venue: {
    id: string;
    name: string;
    location: string | null;
    notes: string | null;
    pricing_by_room_type: boolean;
  };
  initialTypes: {
    capacity: number;
    hasPrivateBathroom: boolean;
    quantity: number;
    price?: number;
    dailyRate?: number;
  }[];
}

export function VenueEditClient({ venue, initialTypes }: VenueEditClientProps) {
  const [name, setName] = useState(venue.name);
  const [location, setLocation] = useState(venue.location ?? "");
  const [notes, setNotes] = useState(venue.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSaveInfo() {
    startTransition(async () => {
      await updateVenue(venue.id, {
        name: name.trim(),
        location: location.trim() || null,
        notes: notes.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/venues"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" />
            Mis Centros
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/events/new?venue=${venue.id}`)}
        >
          Crear evento desde este centro
        </Button>
      </div>

      {/* Info form */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Información del centro
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venue-name">Nombre</Label>
            <Input
              id="venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveInfo}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue-location">Ubicación</Label>
            <Input
              id="venue-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={handleSaveInfo}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue-notes">Notas</Label>
            <textarea
              id="venue-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveInfo}
              placeholder="Notas internas sobre el centro..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
            />
          </div>
          {saved && (
            <p className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="size-3.5" />
              Guardado
            </p>
          )}
        </div>
      </div>

      {/* Room setup */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Habitaciones
        </h2>
        <RoomSetupForm
          mode="venue"
          venueId={venue.id}
          initialTypes={initialTypes}
          initialPricingByRoomType={venue.pricing_by_room_type}
        />
      </div>
    </div>
  );
}
