import { getVenues } from "@/lib/actions/venue";
import { VenueCard } from "@/components/venue/venue-card";
import { NewVenueButton } from "@/components/venue/new-venue-button";
import { Building2 } from "lucide-react";

export default async function VenuesPage() {
  const venues = await getVenues();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Centros</h1>
          <p className="mt-1 text-sm text-gray-500">
            Plantillas reutilizables de centros de retiro
          </p>
        </div>
        <NewVenueButton />
      </div>

      {venues.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Building2 className="mx-auto size-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-400">
            No tienes centros guardados
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Crea uno nuevo o guarda la configuración de un evento existente
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {venues.map((venue) => (
            <VenueCard
              key={venue.id}
              id={venue.id}
              name={venue.name}
              location={venue.location}
              roomCount={venue._count.venue_rooms}
            />
          ))}
        </div>
      )}
    </div>
  );
}
