import { RoomCard } from "./room-card";
import { CreateRoomDialog } from "./create-room-dialog";
import type { RoomData } from "./board-dnd-provider";

type RoomGridProps = {
  eventId: string;
  rooms: RoomData[];
  onUnassign?: (personId: string) => void;
  onPersonClick?: (personId: string) => void;
};

function checkGenderViolation(room: RoomData): boolean {
  if (room.gender_restriction === "mixed") return false;
  const expected = room.gender_restriction === "women" ? "female" : "male";
  return room.event_persons.some(
    (ep) => ep.person.gender !== expected && ep.person.gender !== "unknown"
  );
}

export function RoomGrid({ eventId, rooms, onUnassign, onPersonClick }: RoomGridProps) {
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
            locked={room.locked}
            hasPrivateBathroom={room.has_private_bathroom}
            genderRestriction={room.gender_restriction}
            hasTentatives={room.event_persons.some(
              (ep) => ep.status === "tentative"
            )}
            hasGenderViolation={checkGenderViolation(room)}
            assignedPersons={room.event_persons}
            onUnassign={onUnassign}
            onPersonClick={onPersonClick}
          />
        ))}
        <CreateRoomDialog eventId={eventId} />
      </div>
    </section>
  );
}
