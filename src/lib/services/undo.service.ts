import { db } from "@/lib/db";

type AssignPersonSnapshot = {
  eventPersonId: string;
  previousRoomId: string | null;
};

export const UndoService = {
  async record(
    eventId: string,
    batchId: string,
    type: "assign_person",
    snapshot: AssignPersonSnapshot
  ) {
    return db.undoEntry.create({
      data: {
        event_id: eventId,
        batch_id: batchId,
        type,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
      },
    });
  },

  async recordMany(
    eventId: string,
    batchId: string,
    type: "assign_person",
    snapshots: AssignPersonSnapshot[]
  ) {
    if (snapshots.length === 0) return;
    return db.undoEntry.createMany({
      data: snapshots.map((snapshot) => ({
        event_id: eventId,
        batch_id: batchId,
        type,
        snapshot: JSON.parse(JSON.stringify(snapshot)),
      })),
    });
  },

  async undoLast(
    eventId: string,
    userId: string
  ): Promise<{ undone: number } | null> {
    // Verify ownership
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    // Find the most recent batch
    const latest = await db.undoEntry.findFirst({
      where: { event_id: eventId },
      orderBy: { timestamp: "desc" },
      select: { batch_id: true },
    });
    if (!latest) return null;

    // Get all entries in that batch
    const entries = await db.undoEntry.findMany({
      where: { event_id: eventId, batch_id: latest.batch_id },
    });

    // Revert all and delete entries in a transaction
    await db.$transaction([
      ...entries.map((entry) => {
        const snap = entry.snapshot as unknown as AssignPersonSnapshot;
        return db.eventPerson.update({
          where: { id: snap.eventPersonId },
          data: { room_id: snap.previousRoomId },
        });
      }),
      db.undoEntry.deleteMany({
        where: { event_id: eventId, batch_id: latest.batch_id },
      }),
    ]);

    return { undone: entries.length };
  },

  async hasUndoEntries(eventId: string): Promise<boolean> {
    const count = await db.undoEntry.count({
      where: { event_id: eventId },
    });
    return count > 0;
  },
};
