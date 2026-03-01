"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { assignPerson, unassignPerson } from "@/lib/actions/person";
import { ParticipantsSidebar } from "./participants-sidebar";
import { RoomGrid } from "./room-grid";
import { CreateRoomDialog } from "./create-room-dialog";

export type PersonData = {
  id: string;
  role: string;
  status: string;
  person: {
    name_display: string;
    name_initials: string;
    gender: string;
  };
};

export type RoomData = {
  id: string;
  display_name: string | null;
  internal_number: string;
  capacity: number;
  locked: boolean;
  has_private_bathroom: boolean;
  gender_restriction: string;
  event_persons: PersonData[];
  _count: { event_persons: number };
};

type BoardDndProviderProps = {
  eventId: string;
  initialRooms: RoomData[];
  initialUnassigned: {
    id: string;
    role: string;
    person: {
      name_full: string;
      name_display: string;
      name_initials: string;
      gender: string;
    };
  }[];
  userName?: string | null;
};

export function BoardDndProvider({
  eventId,
  initialRooms,
  initialUnassigned,
}: BoardDndProviderProps) {
  const [rooms, setRooms] = useState(initialRooms);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activePerson = activeId
    ? unassigned.find((p) => p.id === activeId) ||
      rooms
        .flatMap((r) => r.event_persons)
        .find((p) => p.id === activeId)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setError(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const personId = active.id as string;
      const roomId = over.id as string;

      // Find person data from unassigned or from a room
      const fromUnassigned = unassigned.find((p) => p.id === personId);
      const sourceRoom = rooms.find((r) =>
        r.event_persons.some((ep) => ep.id === personId)
      );
      const personInRoom = sourceRoom?.event_persons.find(
        (ep) => ep.id === personId
      );

      const personData = fromUnassigned || personInRoom;
      if (!personData) return;

      // Don't drop on the same room
      if (sourceRoom?.id === roomId) return;

      const targetRoom = rooms.find((r) => r.id === roomId);
      if (!targetRoom) return;

      // Validate: locked room
      if (targetRoom.locked) {
        setError("Habitación cerrada");
        return;
      }

      // Validate: gender restriction
      const gender = personData.person.gender;
      if (
        targetRoom.gender_restriction !== "mixed" &&
        gender !== "unknown"
      ) {
        const expected =
          targetRoom.gender_restriction === "women" ? "female" : "male";
        if (gender !== expected) {
          setError("Restricción de género: no permitido");
          return;
        }
      }

      // Build the person entry for the room
      const newPersonEntry: PersonData = {
        id: personData.id,
        role: personData.role,
        status: "status" in personData ? personData.status : "confirmed",
        person: {
          name_display: personData.person.name_display,
          name_initials: personData.person.name_initials,
          gender: personData.person.gender,
        },
      };

      // Optimistic update
      setRooms((prev) =>
        prev.map((r) => {
          // Remove from source room if applicable
          if (sourceRoom && r.id === sourceRoom.id) {
            const filtered = r.event_persons.filter(
              (ep) => ep.id !== personId
            );
            return {
              ...r,
              event_persons: filtered,
              _count: { event_persons: filtered.length },
            };
          }
          // Add to target room
          if (r.id === roomId) {
            const updated = [...r.event_persons, newPersonEntry];
            return {
              ...r,
              event_persons: updated,
              _count: { event_persons: updated.length },
            };
          }
          return r;
        })
      );

      if (fromUnassigned) {
        setUnassigned((prev) => prev.filter((p) => p.id !== personId));
      }

      try {
        await assignPerson(personId, roomId, eventId);
      } catch (e) {
        // Revert on error
        setRooms(initialRooms);
        setUnassigned(initialUnassigned);
        setError(e instanceof Error ? e.message : "Error al asignar");
      }
    },
    [rooms, unassigned, eventId, initialRooms, initialUnassigned]
  );

  const handleUnassign = useCallback(
    async (personId: string) => {
      const sourceRoom = rooms.find((r) =>
        r.event_persons.some((ep) => ep.id === personId)
      );
      if (!sourceRoom) return;

      const person = sourceRoom.event_persons.find(
        (ep) => ep.id === personId
      );
      if (!person) return;

      // Optimistic update
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id === sourceRoom.id) {
            const filtered = r.event_persons.filter(
              (ep) => ep.id !== personId
            );
            return {
              ...r,
              event_persons: filtered,
              _count: { event_persons: filtered.length },
            };
          }
          return r;
        })
      );

      setUnassigned((prev) =>
        [
          ...prev,
          {
            id: person.id,
            role: person.role,
            person: {
              name_full: person.person.name_display, // best we have
              name_display: person.person.name_display,
              name_initials: person.person.name_initials,
              gender: person.person.gender,
            },
          },
        ].sort((a, b) =>
          a.person.name_display.localeCompare(b.person.name_display)
        )
      );

      try {
        await unassignPerson(personId, eventId);
      } catch {
        setRooms(initialRooms);
        setUnassigned(initialUnassigned);
      }
    },
    [rooms, eventId, initialRooms, initialUnassigned]
  );

  const totalPersons =
    unassigned.length +
    rooms.reduce((acc, r) => acc + r.event_persons.length, 0);
  const assignedCount = rooms.reduce(
    (acc, r) => acc + r.event_persons.length,
    0
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 overflow-hidden">
        <ParticipantsSidebar
          eventId={eventId}
          persons={unassigned}
          onPersonsChange={setUnassigned}
        />

        <main className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 font-medium underline"
              >
                Cerrar
              </button>
            </div>
          )}
          <RoomGrid
            eventId={eventId}
            rooms={rooms}
            onUnassign={handleUnassign}
          />
        </main>
      </div>

      <DragOverlay>
        {activePerson ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-white px-3 py-2 shadow-lg">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {activePerson.person.name_initials}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {activePerson.person.name_display}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
