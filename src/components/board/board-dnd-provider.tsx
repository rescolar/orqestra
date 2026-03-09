"use client";

import { useState, useCallback, useMemo, useId, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  assignPerson,
  unassignPerson,
  getBoardState,
  getAllPersons,
  addPersonToEvent,
  addPersonToEventAndAssign,
  addAllPersonsToEvent,
  removeEventPerson,
  preAssignParticipants,
} from "@/lib/actions/person";
import { createRelationship } from "@/lib/actions/group";
import { undoLastAction } from "@/lib/actions/undo";
import { BoardHeader } from "./board-header";
import {
  ParticipantsSidebar,
  SidebarPerson,
  DirectoryPerson,
} from "./participants-sidebar";
import { RoomGrid } from "./room-grid";
import { PersonDetailPanel, PersonUpdateData, OptimisticRelation } from "./person-detail-panel";
import { RoomDetailPanel } from "./room-detail-panel";
import { PendingsPanel } from "./pendings-panel";

export type PersonData = {
  id: string;
  role: string;
  status: string;
  inseparable_with_id: string | null;
  dietary_notified: boolean;
  requests_text: string | null;
  requests_managed: boolean;
  person: {
    name_display: string;
    name_initials: string;
    gender: string;
    dietary_requirements: string[];
    allergies_text: string | null;
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
    dietary_notified: boolean;
    requests_text: string | null;
    requests_managed: boolean;
    person: {
      name_full: string;
      name_display: string;
      name_initials: string;
      gender: string;
      dietary_requirements: string[];
      allergies_text: string | null;
    };
  }[];
  headerData: {
    eventName: string;
    dateStart: Date;
    dateEnd: Date;
    roomCount: number;
    userName?: string | null;
  };
  eventPricing?: {
    event_price: number | null;
    deposit_amount: number | null;
  } | null;
};

export function BoardDndProvider({
  eventId,
  initialRooms,
  initialUnassigned,
  headerData,
  eventPricing,
}: BoardDndProviderProps) {
  const dndId = useId();
  const [rooms, setRooms] = useState(initialRooms);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showPendingsPanel, setShowPendingsPanel] = useState(false);
  const [panelRefreshKey, setPanelRefreshKey] = useState(0);
  const [optimisticRelation, setOptimisticRelation] = useState<OptimisticRelation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preAssigning, setPreAssigning] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [directoryPersons, setDirectoryPersons] = useState<DirectoryPerson[]>(
    []
  );
  const [undoing, setUndoing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const canUndoRef = useRef(canUndo);
  canUndoRef.current = canUndo;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Custom collision: prioritize pointerWithin (works inside scroll containers
  // like the right panel), fall back to rectIntersection for room grid
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  }, []);

  // Find active person across all sources (unassigned, rooms, directory)
  const activePerson = activeId
    ? (() => {
        // Check if it's a sidebar drag (assigned person dragged from sidebar)
        if (activeId.startsWith("sidebar-")) {
          const strippedId = activeId.replace("sidebar-", "");
          return (
            unassigned.find((p) => p.id === strippedId) ||
            rooms.flatMap((r) => r.event_persons).find((p) => p.id === strippedId)
          );
        }
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

  const handlePreAssign = useCallback(async () => {
    setPreAssigning(true);
    setError(null);
    setSuccessBanner(null);
    try {
      const result = await preAssignParticipants(eventId);
      await handleBoardRefresh();
      const msg =
        result.skipped > 0
          ? `${result.assigned} asignados, ${result.skipped} sin espacio`
          : `${result.assigned} personas asignadas`;
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(null), 4000);
      if (result.assigned > 0) setCanUndo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en pre-asignación");
    } finally {
      setPreAssigning(false);
    }
  }, [eventId, handleBoardRefresh]);

  const handleUndo = useCallback(async () => {
    if (!canUndoRef.current || undoing) return;
    setUndoing(true);
    setError(null);
    setSuccessBanner(null);
    try {
      const result = await undoLastAction(eventId);
      await handleBoardRefresh();
      if (result) {
        setSuccessBanner(
          result.undone === 1
            ? "Acción deshecha"
            : `${result.undone} asignaciones deshechas`
        );
        setTimeout(() => setSuccessBanner(null), 4000);
      }
      // Check if there are more undo entries — if undoLast returned null, nothing left
      if (!result) {
        setCanUndo(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al deshacer");
    } finally {
      setUndoing(false);
    }
  }, [eventId, handleBoardRefresh, undoing]);

  // Keyboard shortcut: Ctrl/Cmd+Z
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo]);

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

      const rawDragId = active.id as string;
      const isSidebarDrag = rawDragId.startsWith("sidebar-");
      const dragId = isSidebarDrag ? rawDragId.replace("sidebar-", "") : rawDragId;
      const overId = over.id as string;

      // Handle relations drop

      if (overId.startsWith("relations-")) {
        const targetPersonId = overId.replace("relations-", "");


        if (dragId.startsWith("person-")) {
          const personId = dragId.replace("person-", "");
          const dp = directoryPersons.find((p) => p.id === personId);
          if (!dp) return;

          if (dp.eventPerson) {
            // Already in event → create relationship using existing EventPerson ID
            const epId = dp.eventPerson.id;
            if (epId === targetPersonId) return;
            const epData = unassigned.find((p) => p.id === epId) ||
              rooms.flatMap((r) => r.event_persons).find((p) => p.id === epId);
            if (epData) {
              setOptimisticRelation({ id: epId, name_display: epData.person.name_display });
            }
            try {
              await createRelationship(eventId, targetPersonId, epId);
              setOptimisticRelation(null);
              setPanelRefreshKey((k) => k + 1);
            } catch (e) {
              setOptimisticRelation(null);
              setError(e instanceof Error ? e.message : "Error al crear relación");
            }
            return;
          }

          // Directory person not in event → add to event first, then create relationship
          setOptimisticRelation({ id: `temp-${personId}`, name_display: dp.name_display });
          setDirectoryPersons((prev) =>
            prev.map((p) =>
              p.id === personId
                ? { ...p, eventPerson: { id: "pending", role: p.default_role, roomName: null } }
                : p
            )
          );
          try {
            const ep = await addPersonToEvent(personId, eventId);
            await createRelationship(eventId, targetPersonId, ep.id);
            await handleBoardRefresh();
            await loadDirectory();
            setOptimisticRelation(null);
            setPanelRefreshKey((k) => k + 1);
          } catch (e) {
            setOptimisticRelation(null);
            setDirectoryPersons((prev) =>
              prev.map((p) =>
                p.id === personId ? { ...p, eventPerson: null } : p
              )
            );
            setError(
              e instanceof Error ? e.message : "Error al crear relación"
            );
          }
          return;
        }

        // Standard EventPerson relation drop
        if (dragId === targetPersonId) return;
        // Optimistic: show chip immediately
        const draggedPerson =
          unassigned.find((p) => p.id === dragId) ||
          rooms.flatMap((r) => r.event_persons).find((p) => p.id === dragId);

        if (draggedPerson) {
          setOptimisticRelation({ id: dragId, name_display: draggedPerson.person.name_display });
        }
        try {

          await createRelationship(eventId, targetPersonId, dragId);
          setOptimisticRelation(null);
          setPanelRefreshKey((k) => k + 1);
        } catch (e) {
          setOptimisticRelation(null);
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

        // Optimistic: mark person as in-event so repeat drags are blocked
        setDirectoryPersons((prev) =>
          prev.map((p) =>
            p.id === personId
              ? { ...p, eventPerson: { id: "pending", role: p.default_role, roomName: null } }
              : p
          )
        );

        try {
          await addPersonToEventAndAssign(
            personId,
            roomId,
            eventId
          );
          // Refresh board + directory
          await handleBoardRefresh();
          await loadDirectory();
        } catch (e) {
          // Revert optimistic directory update
          setDirectoryPersons((prev) =>
            prev.map((p) =>
              p.id === personId ? { ...p, eventPerson: null } : p
            )
          );
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
          status: "status" in personData ? personData.status : "inscrito",
          inseparable_with_id: inseparableId,
          dietary_notified: "dietary_notified" in personData ? (personData as PersonData).dietary_notified : false,
          requests_text: "requests_text" in personData ? (personData as PersonData).requests_text : null,
          requests_managed: "requests_managed" in personData ? (personData as PersonData).requests_managed : false,
          person: {
            name_display: personData.person.name_display,
            name_initials: personData.person.name_initials,
            gender: personData.person.gender,
            dietary_requirements: "dietary_requirements" in personData.person ? (personData.person as PersonData["person"]).dietary_requirements : [],
            allergies_text: "allergies_text" in personData.person ? (personData.person as PersonData["person"]).allergies_text : null,
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
              "status" in partnerData ? partnerData.status : "inscrito",
            inseparable_with_id:
              "inseparable_with_id" in partnerData
                ? (partnerData as { inseparable_with_id: string | null })
                    .inseparable_with_id
                : null,
            dietary_notified: "dietary_notified" in partnerData ? (partnerData as PersonData).dietary_notified : false,
            requests_text: "requests_text" in partnerData ? (partnerData as PersonData).requests_text : null,
            requests_managed: "requests_managed" in partnerData ? (partnerData as PersonData).requests_managed : false,
            person: {
              name_display: partnerData.person.name_display,
              name_initials: partnerData.person.name_initials,
              gender: partnerData.person.gender,
              dietary_requirements: "dietary_requirements" in partnerData.person ? (partnerData.person as PersonData["person"]).dietary_requirements : [],
              allergies_text: "allergies_text" in partnerData.person ? (partnerData.person as PersonData["person"]).allergies_text : null,
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
        setCanUndo(true);
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
            dietary_notified: person.dietary_notified,
            requests_text: person.requests_text,
            requests_managed: person.requests_managed,
            person: {
              name_full: person.person.name_display, // best we have
              name_display: person.person.name_display,
              name_initials: person.person.name_initials,
              gender: person.person.gender,
              dietary_requirements: person.person.dietary_requirements,
              allergies_text: person.person.allergies_text,
            },
          },
        ].sort((a, b) =>
          a.person.name_display.localeCompare(b.person.name_display)
        )
      );

      try {
        await unassignPerson(personId, eventId);
        setCanUndo(true);
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
      const applyChanges = (ep: PersonData) => ({
        ...ep,
        role: (changes.role as string) ?? ep.role,
        status: (changes.status as string) ?? ep.status,
        dietary_notified: changes.dietary_notified ?? ep.dietary_notified,
        requests_text: changes.requests_text !== undefined ? changes.requests_text : ep.requests_text,
        requests_managed: changes.requests_managed ?? ep.requests_managed,
        person: {
          ...ep.person,
          gender: (changes.gender as string) ?? ep.person.gender,
          dietary_requirements: changes.dietary_requirements ?? ep.person.dietary_requirements,
          allergies_text: changes.allergies_text !== undefined ? changes.allergies_text : ep.person.allergies_text,
        },
      });
      // Update person in rooms
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          event_persons: r.event_persons.map((ep) =>
            ep.id === id ? applyChanges(ep) : ep
          ),
        }))
      );
      // Update person in unassigned
      setUnassigned((prev) =>
        prev.map((ep) =>
          ep.id === id ? { ...applyChanges(ep as unknown as PersonData), person: { ...ep.person, gender: (changes.gender as string) ?? ep.person.gender } } : ep
        )
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

  const handleAddToEvent = useCallback(
    async (personId: string) => {
      try {
        await addPersonToEvent(personId, eventId);
        await handleBoardRefresh();
        await loadDirectory();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al agregar persona");
      }
    },
    [eventId, handleBoardRefresh, loadDirectory]
  );

  const handleRemoveFromEvent = useCallback(
    async (eventPersonId: string) => {
      try {
        await removeEventPerson(eventPersonId, eventId);
        await handleBoardRefresh();
        await loadDirectory();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al quitar persona");
      }
    },
    [eventId, handleBoardRefresh, loadDirectory]
  );

  const handleAddAllToEvent = useCallback(async () => {
    try {
      const result = await addAllPersonsToEvent(eventId);
      await handleBoardRefresh();
      await loadDirectory();
      if (result.added > 0) {
        setSuccessBanner(`${result.added} personas agregadas al evento`);
        setTimeout(() => setSuccessBanner(null), 4000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al agregar todos");
    }
  }, [eventId, handleBoardRefresh, loadDirectory]);

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
    // Dietary/allergies not notified (dietary data lives on person)
    const dietaryPending = allPersons.filter(
      (ep) => !ep.dietary_notified && (ep.person.dietary_requirements.length > 0 || ep.person.allergies_text)
    ).length;
    // Cancellation requests
    const cancelRequestPending = allPersons.filter((ep) => ep.status === "solicita_cancelacion").length;
    // Unresolved requests
    const requestsPending = allPersons.filter(
      (ep) => ep.requests_text && !ep.requests_managed
    ).length;
    return roomConflicts + dietaryPending + cancelRequestPending + requestsPending;
  }, [rooms, unassigned]);

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <BoardHeader
        eventId={eventId}
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
        onPreAssign={handlePreAssign}
        preAssigning={preAssigning}
        onUndo={handleUndo}
        undoing={undoing}
        canUndo={canUndo}
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
          onAddToEvent={handleAddToEvent}
          onRemoveFromEvent={handleRemoveFromEvent}
          onAddAllToEvent={handleAddAllToEvent}
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
          {successBanner && (
            <div className="mb-4 rounded-lg border border-success/30 bg-success/5 px-4 py-2 text-sm text-success">
              <span className="material-symbols-outlined mr-1 align-middle text-base">check_circle</span>
              {successBanner}
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
            optimisticRelation={optimisticRelation}
            isDragActive={!!activeId}
            eventPricing={eventPricing}
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
