import { db } from "@/lib/db";
import { UndoService } from "./undo.service";

type UnassignedPerson = {
  id: string;
  role: string;
  status: string;
  inseparable_with_id: string | null;
  person: { gender: string };
};

type EligibleRoom = {
  id: string;
  capacity: number;
  gender_restriction: string;
  occupants: number;
};

function fitsRoom(gender: string, room: EligibleRoom): boolean {
  if (room.gender_restriction === "mixed") return true;
  if (gender === "unknown") return true;
  const expected = room.gender_restriction === "women" ? "female" : "male";
  return gender === expected;
}

function freeSlots(room: EligibleRoom): number {
  return room.capacity - room.occupants;
}

function sortPriority(a: UnassignedPerson, b: UnassignedPerson): number {
  const priority = (p: UnassignedPerson) => {
    const isTentative = p.status === "tentative" ? 100 : 0;
    // Inseparable pairs handled separately, but within the solo pass:
    if (p.role === "facilitator") return 10 + isTentative;
    if (p.person.gender === "female") return 20 + isTentative;
    if (p.person.gender === "male") return 30 + isTentative;
    return 40 + isTentative; // other/unknown
  };
  return priority(a) - priority(b);
}

export const PreAssignService = {
  async preAssign(
    eventId: string,
    userId: string
  ): Promise<{ assigned: number; skipped: number }> {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    // Load eligible rooms (not locked, ordered by internal_number)
    const rawRooms = await db.room.findMany({
      where: { event_id: eventId, locked: false },
      select: {
        id: true,
        capacity: true,
        gender_restriction: true,
        internal_number: true,
        _count: { select: { event_persons: true } },
      },
      orderBy: { internal_number: "asc" },
    });

    const rooms: EligibleRoom[] = rawRooms
      .map((r) => ({
        id: r.id,
        capacity: r.capacity,
        gender_restriction: r.gender_restriction,
        occupants: r._count.event_persons,
      }))
      .filter((r) => freeSlots(r) > 0);

    // Load unassigned persons (not cancelled)
    const unassigned = await db.eventPerson.findMany({
      where: {
        event_id: eventId,
        room_id: null,
        status: { not: "cancelled" },
      },
      select: {
        id: true,
        role: true,
        status: true,
        inseparable_with_id: true,
        person: { select: { gender: true } },
      },
    });

    if (unassigned.length === 0 || rooms.length === 0) {
      return { assigned: 0, skipped: unassigned.length };
    }

    // Separate inseparable pairs from solo persons
    const pairedIds = new Set<string>();
    const pairs: [UnassignedPerson, UnassignedPerson][] = [];

    for (const p of unassigned) {
      if (p.inseparable_with_id && !pairedIds.has(p.id)) {
        const partner = unassigned.find(
          (u) => u.id === p.inseparable_with_id
        );
        if (partner) {
          pairedIds.add(p.id);
          pairedIds.add(partner.id);
          pairs.push([p, partner]);
        }
      }
    }

    const solos = unassigned
      .filter((p) => !pairedIds.has(p.id))
      .sort(sortPriority);

    // Assignments to execute
    const assignments: { id: string; roomId: string }[] = [];

    // 1. Place inseparable pairs
    for (const [a, b] of pairs) {
      const room = rooms.find(
        (r) =>
          freeSlots(r) >= 2 &&
          fitsRoom(a.person.gender, r) &&
          fitsRoom(b.person.gender, r)
      );
      if (room) {
        assignments.push({ id: a.id, roomId: room.id });
        assignments.push({ id: b.id, roomId: room.id });
        room.occupants += 2;
      }
    }

    // 2. Place solo persons
    for (const p of solos) {
      const room = rooms.find(
        (r) => freeSlots(r) >= 1 && fitsRoom(p.person.gender, r)
      );
      if (room) {
        assignments.push({ id: p.id, roomId: room.id });
        room.occupants += 1;
      }
    }

    // Execute all assignments in a transaction
    if (assignments.length > 0) {
      await db.$transaction(
        assignments.map((a) =>
          db.eventPerson.update({
            where: { id: a.id },
            data: { room_id: a.roomId },
          })
        )
      );

      // Record undo entries with shared batch_id
      const batchId = crypto.randomUUID();
      await UndoService.recordMany(
        eventId,
        batchId,
        "assign_person",
        assignments.map((a) => ({
          eventPersonId: a.id,
          previousRoomId: null,
        }))
      );
    }

    return {
      assigned: assignments.length,
      skipped: unassigned.length - assignments.length,
    };
  },
};
