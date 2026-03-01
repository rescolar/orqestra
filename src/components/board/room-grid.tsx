import { RoomCard } from "./room-card";
import { CreateRoomDialog } from "./create-room-dialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RoomGridProps = {
  eventId: string;
  rooms: {
    id: string;
    display_name: string | null;
    internal_number: string;
    capacity: number;
    locked: boolean;
    has_private_bathroom: boolean;
    gender_restriction: string;
    _count: { event_persons: number };
    event_persons: {
      id: string;
      status: string;
      person: { gender: string };
    }[];
  }[];
};

function checkGenderViolation(
  room: RoomGridProps["rooms"][number]
): boolean {
  if (room.gender_restriction === "mixed") return false;
  const expected = room.gender_restriction === "women" ? "female" : "male";
  return room.event_persons.some((ep) => ep.person.gender !== expected && ep.person.gender !== "unknown");
}

export function RoomGrid({ eventId, rooms }: RoomGridProps) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary">
          Asignación de Habitaciones
        </h2>
        <p className="text-sm text-gray-400">
          {rooms.length} habitaciones configuradas
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            id={room.id}
            displayName={room.display_name || `Hab ${room.internal_number}`}
            internalNumber={room.internal_number}
            capacity={room.capacity}
            assignedCount={room._count.event_persons}
            locked={room.locked}
            hasPrivateBathroom={room.has_private_bathroom}
            genderRestriction={room.gender_restriction}
            hasTentatives={room.event_persons.some(
              (ep) => ep.status === "tentative"
            )}
            hasGenderViolation={checkGenderViolation(room)}
          />
        ))}
        <CreateRoomDialog eventId={eventId} />
      </div>
    </section>
  );
}
