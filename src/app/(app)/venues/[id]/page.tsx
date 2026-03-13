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

  // Aggregate venue rooms into types for the form
  const typeMap = new Map<
    string,
    {
      capacity: number;
      hasPrivateBathroom: boolean;
      quantity: number;
      price?: number;
      dailyRate?: number;
    }
  >();

  for (const vr of venue.venue_rooms) {
    const key = `${vr.capacity}-${vr.has_private_bathroom}`;
    const existing = typeMap.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      typeMap.set(key, {
        capacity: vr.capacity,
        hasPrivateBathroom: vr.has_private_bathroom,
        quantity: 1,
        ...(vr.price != null && { price: Number(vr.price) }),
        ...(vr.daily_rate != null && { dailyRate: Number(vr.daily_rate) }),
      });
    }
  }

  const initialTypes = Array.from(typeMap.values());

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <VenueEditClient
        venue={{
          id: venue.id,
          name: venue.name,
          location: venue.location,
          notes: venue.notes,
          pricing_by_room_type: venue.pricing_by_room_type,
        }}
        initialTypes={initialTypes}
      />
    </div>
  );
}
