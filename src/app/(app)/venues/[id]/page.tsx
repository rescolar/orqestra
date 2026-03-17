import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { VenueService } from "@/lib/services/venue.service";
import { VenueEditClient } from "@/components/venue/venue-edit-client";

export default async function VenueEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  let venue;
  try {
    venue = await VenueService.getVenue(id, {
      userId: session.user.id,
      role: session.user.role,
    });
  } catch {
    notFound();
  }

  // Serialize room types for client
  const roomTypes = venue.room_types.map((rt) => ({
    id: rt.id,
    name: rt.name,
    description: rt.description,
    capacity: rt.capacity,
    has_private_bathroom: rt.has_private_bathroom,
    base_price: rt.base_price != null ? Number(rt.base_price) : null,
    position: rt.position,
    occupancy_pricings: rt.occupancy_pricings.map((op) => ({
      occupancy: op.occupancy,
      price: Number(op.price),
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <VenueEditClient
        venue={{
          id: venue.id,
          name: venue.name,
          location: venue.location,
          notes: venue.notes,
        }}
        roomTypes={roomTypes}
      />
    </div>
  );
}
