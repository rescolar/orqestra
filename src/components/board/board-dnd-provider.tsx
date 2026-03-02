"use client";

import { useState, useCallback, useMemo, useId } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  assignPerson,
  unassignPerson,
  getBoardState,
  getAllPersons,
  addPersonToEvent,
  addPersonToEventAndAssign,
} from "@/lib/actions/person";
import { createRelationship } from "@/lib/actions/group";
import { BoardHeader } from "./board-header";
import {
  ParticipantsSidebar,
  SidebarPerson,
  DirectoryPerson,
} from "./participants-sidebar";
import { RoomGrid } from "./room-grid";
import { PersonDetailPanel, PersonUpdateData } from "./person-detail-panel";
import { RoomDetailPanel } from "./room-detail-panel";
import { PendingsPanel } from "./pendings-panel";

export type PersonData = {
  id: string;
  role: string;
  status: string;
  inseparable_with_id: string | null;
  dietary_requirements: string[];
  dietary_notified: boolean;
  allergies_text: string | null;
  requests_text: string | null;
  requests_managed: boolean;
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
  conflict_acknowledged: boolean;
  event_persons: PersonData[];
  _count: { event_persons: number };
};

type BoardDndProviderProps = {
  eventId: string;
  initialRooms: RoomData[];
  initialUnassigned: {
    id: string;
    role: string;
    status: string;
    inseparable_with_id: string | null;
    dietary_requirements: string[];
    dietary_notified: boolean;
    allergies_text: string | null;
    requests_text: string | null;
    requests_managed: boolean;
    person: {
      name_full: string;
      name_display: string;
      name_initials: string;
      gender: string;
    };
  }[];
  headerData: {
    eventName: string;
    dateStart: Date;
    dateEnd: Date;
    roomCount: number;
    userName?: string | null;
  };
};

export function BoardDndProvider({
  eventId,
  initialRooms,
  initialUnassigned,
  headerData,
}: BoardDndProviderProps) {
  const dndId = useId();
  const [rooms, setRooms] = useState(initialRooms);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showPendingsPanel, setShowPendingsPanel] = useState(false);
  const [panelRefreshKey, setPanelRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [directoryPersons, setDirectoryPersons] = useState<DirectoryPerson[]>(
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Find active person across all sources (unassigned, rooms, directory)
  const activePerson = activeId
    ? (() => {
        // Check if it's a directory person
        if (activeId.startsWith("person-")) {
          const personId = activeId.replace("person-", "");
          const dp = directoryPersons.find((p) => p.id === personId);
          if (dp) {
            return {
              id: activeId,
              role: dp.default_role,
              person: {
                name_display: dp.name_display,
                name_initials: dp.name_initials,
                gender: dp.gender,
              },
            };
          }
          return null;
        }
        return (
          unassigned.find((p) => p.id === activeId) ||
          rooms.flatMap((r) => r.event_persons).find((p) => p.id === activeId)
        );
      })()
    : null;

  const handleBoardRefresh = useCallback(async () => {
    try {
      const state = await getBoardState(eventId);
      setRooms(state.rooms);
      setUnassigned(state.unassigned);
    } catch {
      // ignore
    }
  }, [eventId]);

  const loadDirectory = useCallback(async () => {
    try {
      const persons = await getAllPersons(eventId);
      setDirectoryPersons(
        persons.map((p) => ({
          id: p.id,
          name_full: p.name_full,
          name_display: p.name_display,
          name_initials: p.name_initials,
          gender: p.gender,
          default_role: p.default_role,
          eventPerson:
            p.event_persons.length > 0
              ? {
                  id: p.event_persons[0].id,
                  role: p.event_persons[0].role,
                  roomName: p.event_persons[0].room
                    ? p.event_persons[0].room.display_name ||
                      p.event_persons[0].room.internal_number
                    : null,
                }
              : null,
        }))
      );
    } catch {
      // ignore
    }
  }, [eventId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setError(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const dragId = active.id as string;
      const overId = over.id as string;

      // Handle relations drop
      if (overId.startsWith("relations-")) {
        const targetPersonId = overId.replace("relations-", "");

        if (dragId.startsWith("person-")) {
          // Directory person → add to event first, then create relationship
          const personId = dragId.replace("person-", "");
          const dp = directoryPersons.find((p) => p.id === personId);
          if (!dp || dp.eventPerson) return;
          try {
            const ep = await addPersonToEvent(personId, eventId);
            await createRelationship(eventId, targetPersonId, ep.id);
            await handleBoardRefresh();
            await loadDirectory();
            setPanelRefreshKey((k) => k + 1);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Error al crear relacion"
            );
          }
          return;
        }

        // Standard EventPerson relation drop
        if (dragId === targetPersonId) return;
        try {
          await createRelationship(eventId, targetPersonId, dragId);
          setPanelRefreshKey((k) => k + 1);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Error al crear relacion"
          );
        }
        return;
      }

      const roomId = overId;
      const targetRoom = rooms.find((r) => r.id === roomId);
      if (!targetRoom) return;

      // Handle directory person drag (person- prefix)
      if (dragId.startsWith("person-")) {
        const personId = dragId.replace("person-", "");
        const dp = directoryPersons.find((p) => p.id === personId);
        if (!dp) return;

        // Already in event? skip
        if (dp.eventPerson) {
          setError("Ya esta en el evento");
          return;
        }

        // Validate locked
        if (targetRoom.locked) {
          setError("Habitacion cerrada");
          return;
        }

        // Validate gender
        if (
          targetRoom.gender_restriction !== "mixed" &&
          dp.gender !== "unknown"
        ) {
          const expected =
            targetRoom.gender_restriction === "women" ? "female" : "male";
          if (dp.gender !== expected) {
            setError("Restriccion de genero: no permitido");
            return;
          }
        }

        try {
          const ep = await addPersonToEventAndAssign(
            personId,
            roomId,
            eventId
          );
          // Refresh board + directory
          await handleBoardRefresh();
          await loadDirectory();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Error al agregar persona"
          );
        }
        return;
      }

      // Standard EventPerson drag (existing logic)
      const personId = dragId;

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

      if (!targetRoom) return;

      // Validate: locked room
      if (targetRoom.locked) {
        setError("Habitacion cerrada");
        return;
      }

      // Validate: gender restriction
      const gender = personData.person.gender;
      if (targetRoom.gender_restriction !== "mixed" && gender !== "unknown") {
        const expected =
          targetRoom.gender_restriction === "women" ? "female" : "male";
        if (gender !== expected) {
          setError("Restriccion de genero: no permitido");
          return;
        }
      }

      // Find inseparable partner (if any)
      const inseparableId =
        "inseparable_with_id" in personData
          ? (personData as { inseparable_with_id: string | null })
              .inseparable_with_id
          : null;

      let partnerData: PersonData | (typeof unassigned)[number] | null = null;
      let partnerFromUnassigned = false;
      let partnerSourceRoom: RoomData | undefined;

      if (inseparableId) {
        const pu = unassigned.find((p) => p.id === inseparableId);
        if (pu) {
          partnerData = pu;
          partnerFromUnassigned = true;
        } else {
          partnerSourceRoom = rooms.find((r) =>
            r.event_persons.some((ep) => ep.id === inseparableId)
          );
          if (partnerSourceRoom) {
            partnerData =
              partnerSourceRoom.event_persons.find(
                (ep) => ep.id === inseparableId
              ) ?? null;
          }
        }
        // Skip if partner is already in target room
        if (partnerSourceRoom?.id === roomId) {
          partnerData = null;
        }
      }

      // Build person entries for the room
      const toMove: {
        entry: PersonData;
        fromUnassigned: boolean;
        sourceRoomId?: string;
      }[] = [];

      toMove.push({
        entry: {
          id: personData.id,
          role: personData.role,
          status: "status" in personData ? personData.status : "confirmed",
          inseparable_with_id: inseparableId,
          dietary_requirements: "dietary_requirements" in personData ? (personData as PersonData).dietary_requirements : [],
          dietary_notified: "dietary_notified" in personData ? (personData as PersonData).dietary_notified : false,
          allergies_text: "allergies_text" in personData ? (personData as PersonData).allergies_text : null,
          requests_text: "requests_text" in personData ? (personData as PersonData).requests_text : null,
          requests_managed: "requests_managed" in personData ? (personData as PersonData).requests_managed : false,
          person: {
            name_display: personData.person.name_display,
            name_initials: personData.person.name_initials,
            gender: personData.person.gender,
          },
        },
        fromUnassigned: !!fromUnassigned,
        sourceRoomId: sourceRoom?.id,
      });

      if (partnerData) {
        toMove.push({
          entry: {
            id: partnerData.id,
            role: partnerData.role,
            status:
              "status" in partnerData ? partnerData.status : "confirmed",
            inseparable_with_id:
              "inseparable_with_id" in partnerData
                ? (partnerData as { inseparable_with_id: string | null })
                    .inseparable_with_id
                : null,
            dietary_requirements: "dietary_requirements" in partnerData ? (partnerData as PersonData).dietary_requirements : [],
            dietary_notified: "dietary_notified" in partnerData ? (partnerData as PersonData).dietary_notified : false,
            allergies_text: "allergies_text" in partnerData ? (partnerData as PersonData).allergies_text : null,
            requests_text: "requests_text" in partnerData ? (partnerData as PersonData).requests_text : null,
            requests_managed: "requests_managed" in partnerData ? (partnerData as PersonData).requests_managed : false,
            person: {
              name_display: partnerData.person.name_display,
              name_initials: partnerData.person.name_initials,
              gender: partnerData.person.gender,
            },
          },
          fromUnassigned: partnerFromUnassigned,
          sourceRoomId: partnerSourceRoom?.id,
        });
      }

      // Optimistic update
      const idsToMove = toMove.map((t) => t.entry.id);
      const sourceRoomIds = toMove
        .map((t) => t.sourceRoomId)
        .filter(Boolean) as string[];
      const unassignedIds = toMove
        .filter((t) => t.fromUnassigned)
        .map((t) => t.entry.id);

      setRooms((prev) =>
        prev.map((r) => {
          let eps = r.event_persons;
          // Remove from source rooms
          if (sourceRoomIds.includes(r.id)) {
            eps = eps.filter((ep) => !idsToMove.includes(ep.id));
          }
          // Add to target room
          if (r.id === roomId) {
            eps = [...eps, ...toMove.map((t) => t.entry)];
          }
          if (eps !== r.event_persons) {
            return {
              ...r,
              event_persons: eps,
              _count: { event_persons: eps.length },
            };
          }
          return r;
        })
      );

      if (unassignedIds.length > 0) {
        setUnassigned((prev) =>
          prev.filter((p) => !unassignedIds.includes(p.id))
        );
      }

      try {
        await assignPerson(personId, roomId, eventId);
        if (partnerData) {
          await assignPerson(partnerData.id, roomId, eventId);
        }
      } catch (e) {
        // Revert on error
        setRooms(initialRooms);
        setUnassigned(initialUnassigned);
        setError(e instanceof Error ? e.message : "Error al asignar");
      }
    },
    [rooms, unassigned, eventId, initialRooms, initialUnassigned, directoryPersons, handleBoardRefresh, loadDirectory]
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
            status: person.status,
            inseparable_with_id: person.inseparable_with_id,
            dietary_requirements: person.dietary_requirements,
            dietary_notified: person.dietary_notified,
            allergies_text: person.allergies_text,
            requests_text: person.requests_text,
            requests_managed: person.requests_managed,
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

  const handlePersonClick = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setSelectedRoomId(null);
    setShowPendingsPanel(false);
  }, []);

  const handleRoomClick = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
    setSelectedPersonId(null);
    setShowPendingsPanel(false);
  }, []);

  const handlePendingClick = useCallback(() => {
    setShowPendingsPanel(true);
    setSelectedPersonId(null);
    setSelectedRoomId(null);
  }, []);

  const handlePersonUpdated = useCallback(
    (id: string, changes: PersonUpdateData) => {
      // Update person in rooms
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          event_persons: r.event_persons.map((ep) => {
            if (ep.id !== id) return ep;
            return {
              ...ep,
              role: (changes.role as string) ?? ep.role,
              status: (changes.status as string) ?? ep.status,
              person: {
                ...ep.person,
                gender: (changes.gender as string) ?? ep.person.gender,
              },
            };
          }),
        }))
      );
      // Update person in unassigned
      setUnassigned((prev) =>
        prev.map((ep) => {
          if (ep.id !== id) return ep;
          return {
            ...ep,
            role: (changes.role as string) ?? ep.role,
            person: {
              ...ep.person,
              gender: (changes.gender as string) ?? ep.person.gender,
            },
          };
        })
      );
    },
    []
  );

  const handlePersonRemoved = useCallback((id: string) => {
    setSelectedPersonId(null);
    setRooms((prev) =>
      prev.map((r) => {
        const filtered = r.event_persons.filter((ep) => ep.id !== id);
        if (filtered.length === r.event_persons.length) return r;
        return {
          ...r,
          event_persons: filtered,
          _count: { event_persons: filtered.length },
        };
      })
    );
    setUnassigned((prev) => prev.filter((ep) => ep.id !== id));
  }, []);

  // All event persons for sidebar "Evento" scope
  const allEventPersons: SidebarPerson[] = useMemo(() => {
    const fromUnassigned: SidebarPerson[] = unassigned.map((p) => ({
      id: p.id,
      role: p.role,
      roomName: null,
      person: p.person,
    }));
    const fromRooms: SidebarPerson[] = rooms.flatMap((r) =>
      r.event_persons.map((ep) => ({
        id: ep.id,
        role: ep.role,
        roomName: r.display_name || r.internal_number,
        person: {
          name_full: ep.person.name_display,
          name_display: ep.person.name_display,
          name_initials: ep.person.name_initials,
          gender: ep.person.gender,
        },
      }))
    );
    return [...fromUnassigned, ...fromRooms].sort((a, b) =>
      a.person.name_display.localeCompare(b.person.name_display)
    );
  }, [unassigned, rooms]);

  const assignedCount = rooms.reduce(
    (acc, r) => acc + r.event_persons.length,
    0
  );
  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
  const pendingCount = useMemo(() => {
    const allPersons = [
      ...rooms.flatMap((r) => r.event_persons),
      ...unassigned,
    ];
    // Room conflicts: capacity overflow or gender violation
    const roomConflicts = rooms.filter((r) => {
      if (r.event_persons.length > r.capacity) return true;
      if (r.gender_restriction !== "mixed") {
        const expected = r.gender_restriction === "women" ? "female" : "male";
        if (r.event_persons.some((ep) => ep.person.gender !== expected && ep.person.gender !== "unknown")) return true;
      }
      return false;
    }).length;
    // Dietary/allergies not notified
    const dietaryPending = allPersons.filter(
      (ep) => !ep.dietary_notified && (ep.dietary_requirements.length > 0 || ep.allergies_text)
    ).length;
    // Tentative participants
    const tentativePending = allPersons.filter((ep) => ep.status === "tentative").length;
    // Unresolved requests
    const requestsPending = allPersons.filter(
      (ep) => ep.requests_text && !ep.requests_managed
    ).length;
    return roomConflicts + dietaryPending + tentativePending + requestsPending;
  }, [rooms, unassigned]);

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <BoardHeader
        eventName={headerData.eventName}
        dateStart={headerData.dateStart}
        dateEnd={headerData.dateEnd}
        assignedCount={assignedCount}
        totalPersons={totalCapacity}
        roomCount={headerData.roomCount}
        unassignedCount={unassigned.length}
        pendingCount={pendingCount}
        userName={headerData.userName}
        onPendingClick={handlePendingClick}
      />

      <div className="flex flex-1 overflow-hidden">
        <ParticipantsSidebar
          eventId={eventId}
          persons={unassigned}
          allEventPersons={allEventPersons}
          directoryPersons={directoryPersons}
          onPersonsChange={setUnassigned}
          onPersonClick={handlePersonClick}
          onLoadDirectory={loadDirectory}
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
            onPersonClick={handlePersonClick}
            onRoomClick={handleRoomClick}
          />
        </main>

        {selectedPersonId && (
          <PersonDetailPanel
            key={selectedPersonId}
            eventPersonId={selectedPersonId}
            eventId={eventId}
            refreshKey={panelRefreshKey}
            onClose={() => setSelectedPersonId(null)}
            onPersonUpdated={handlePersonUpdated}
            onPersonRemoved={handlePersonRemoved}
            onPersonClick={(id) => setSelectedPersonId(id)}
            onBoardRefresh={handleBoardRefresh}
          />
        )}

        {selectedRoomId && (
          <RoomDetailPanel
            key={selectedRoomId}
            roomId={selectedRoomId}
            eventId={eventId}
            onClose={() => setSelectedRoomId(null)}
            onRoomUpdated={handleBoardRefresh}
            onPersonClick={handlePersonClick}
            onUnassign={handleUnassign}
          />
        )}

        {showPendingsPanel && (
          <PendingsPanel
            eventId={eventId}
            refreshKey={panelRefreshKey}
            onClose={() => setShowPendingsPanel(false)}
            onPersonClick={handlePersonClick}
            onRoomClick={handleRoomClick}
            onItemResolved={handleBoardRefresh}
          />
        )}
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
