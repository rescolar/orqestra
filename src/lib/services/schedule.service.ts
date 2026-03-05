import { db } from "@/lib/db";
import { ScheduleBlockType } from "@prisma/client";

export type DaySchedule = {
  day_index: number;
  date: Date;
  blocks: {
    id: string;
    type: "common" | "parallel";
    position: number;
    activities: {
      id: string;
      title: string;
      description: string | null;
      time_label: string | null;
      position: number;
      signup_count: number;
    }[];
  }[];
};

export type ParticipantActivity = {
  id: string;
  title: string;
  description: string | null;
  time_label: string | null;
  position: number;
  signup_count: number;
  my_signup: boolean;
};

export type ParticipantDaySchedule = {
  day_index: number;
  date: Date;
  blocks: {
    id: string;
    type: "common" | "parallel";
    position: number;
    activities: ParticipantActivity[];
  }[];
};

function buildDaySchedules(
  event: { date_start: Date; date_end: Date },
  blocks: {
    id: string;
    day_index: number;
    position: number;
    type: ScheduleBlockType;
    activities: {
      id: string;
      title: string;
      description: string | null;
      time_label: string | null;
      position: number;
      _count: { signups: number };
    }[];
  }[],
  mySignupActivityIds?: Set<string>
): DaySchedule[] {
  const start = new Date(event.date_start);
  const end = new Date(event.date_end);
  const dayCount =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const days: DaySchedule[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    days.push({ day_index: i, date, blocks: [] });
  }

  for (const block of blocks) {
    const day = days[block.day_index];
    if (!day) continue;
    day.blocks.push({
      id: block.id,
      type: block.type,
      position: block.position,
      activities: block.activities
        .sort((a, b) => a.position - b.position)
        .map((a) => {
          const base = {
            id: a.id,
            title: a.title,
            description: a.description,
            time_label: a.time_label,
            position: a.position,
            signup_count: a._count.signups,
          };
          if (mySignupActivityIds) {
            return { ...base, my_signup: mySignupActivityIds.has(a.id) };
          }
          return base;
        }),
    });
    day.blocks.sort((a, b) => a.position - b.position);
  }

  return days;
}

export type BlockAssignments = {
  activities: {
    id: string;
    title: string;
    assigned: { id: string; name_display: string; name_initials: string }[];
  }[];
  unassigned: { id: string; name_display: string; name_initials: string }[];
};

export const ScheduleService = {
  async getSchedule(eventId: string, userId: string): Promise<DaySchedule[]> {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { date_start: true, date_end: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const blocks = await db.scheduleBlock.findMany({
      where: { event_id: eventId },
      include: {
        activities: {
          include: { _count: { select: { signups: true } } },
        },
      },
      orderBy: [{ day_index: "asc" }, { position: "asc" }],
    });

    return buildDaySchedules(event, blocks);
  },

  async createBlock(
    eventId: string,
    userId: string,
    data: { day_index: number; type: ScheduleBlockType }
  ) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const lastBlock = await db.scheduleBlock.findFirst({
      where: { event_id: eventId, day_index: data.day_index },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const position = lastBlock ? lastBlock.position + 1 : 0;

    const block = await db.scheduleBlock.create({
      data: {
        event_id: eventId,
        day_index: data.day_index,
        position,
        type: data.type,
        activities: {
          create:
            data.type === "common"
              ? [{ title: "Nueva actividad", position: 0 }]
              : [
                  { title: "Actividad 1", position: 0 },
                  { title: "Actividad 2", position: 1 },
                ],
        },
      },
      include: {
        activities: {
          include: { _count: { select: { signups: true } } },
        },
      },
    });

    return block;
  },

  async moveBlock(
    blockId: string,
    userId: string,
    direction: "up" | "down"
  ) {
    const block = await db.scheduleBlock.findFirst({
      where: { id: blockId, event: { user_id: userId } },
    });
    if (!block) throw new Error("Bloque no encontrado");

    const sibling = await db.scheduleBlock.findFirst({
      where: {
        event_id: block.event_id,
        day_index: block.day_index,
        position:
          direction === "up" ? { lt: block.position } : { gt: block.position },
      },
      orderBy: { position: direction === "up" ? "desc" : "asc" },
    });

    if (!sibling) return;

    await db.$transaction([
      db.scheduleBlock.update({
        where: { id: block.id },
        data: { position: sibling.position },
      }),
      db.scheduleBlock.update({
        where: { id: sibling.id },
        data: { position: block.position },
      }),
    ]);
  },

  async deleteBlock(blockId: string, userId: string) {
    const block = await db.scheduleBlock.findFirst({
      where: { id: blockId, event: { user_id: userId } },
      select: { id: true },
    });
    if (!block) throw new Error("Bloque no encontrado");

    await db.scheduleBlock.delete({ where: { id: blockId } });
  },

  async createActivity(
    blockId: string,
    userId: string,
    data: { title?: string }
  ) {
    const block = await db.scheduleBlock.findFirst({
      where: { id: blockId, event: { user_id: userId } },
      include: { _count: { select: { activities: true } } },
    });
    if (!block) throw new Error("Bloque no encontrado");
    if (block.type === "common")
      throw new Error("Un bloque común solo tiene una actividad");
    if (block._count.activities >= 3)
      throw new Error("Máximo 3 actividades por bloque paralelo");

    return db.scheduleActivity.create({
      data: {
        block_id: blockId,
        title: data.title || `Actividad ${block._count.activities + 1}`,
        position: block._count.activities,
      },
      include: { _count: { select: { signups: true } } },
    });
  },

  async updateActivity(
    activityId: string,
    userId: string,
    data: { title?: string; description?: string | null; time_label?: string | null }
  ) {
    const activity = await db.scheduleActivity.findFirst({
      where: { id: activityId, block: { event: { user_id: userId } } },
      select: { id: true },
    });
    if (!activity) throw new Error("Actividad no encontrada");

    return db.scheduleActivity.update({
      where: { id: activityId },
      data,
    });
  },

  async deleteActivity(activityId: string, userId: string) {
    const activity = await db.scheduleActivity.findFirst({
      where: { id: activityId, block: { event: { user_id: userId } } },
      include: { block: { include: { _count: { select: { activities: true } } } } },
    });
    if (!activity) throw new Error("Actividad no encontrada");

    if (activity.block._count.activities <= 1) {
      await db.scheduleBlock.delete({ where: { id: activity.block.id } });
    } else {
      await db.scheduleActivity.delete({ where: { id: activityId } });
    }
  },

  async getScheduleForParticipant(
    eventId: string,
    participantUserId: string
  ): Promise<ParticipantDaySchedule[]> {
    const eventPerson = await db.eventPerson.findFirst({
      where: {
        event_id: eventId,
        person: { self_user_id: participantUserId },
      },
      select: { id: true },
    });
    if (!eventPerson) throw new Error("No estás inscrito en este evento");

    const event = await db.event.findFirst({
      where: { id: eventId },
      select: { date_start: true, date_end: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const blocks = await db.scheduleBlock.findMany({
      where: { event_id: eventId },
      include: {
        activities: {
          include: { _count: { select: { signups: true } } },
        },
      },
      orderBy: [{ day_index: "asc" }, { position: "asc" }],
    });

    const mySignups = await db.activitySignup.findMany({
      where: { event_person_id: eventPerson.id },
      select: { activity_id: true },
    });
    const mySignupIds = new Set(mySignups.map((s) => s.activity_id));

    return buildDaySchedules(
      event,
      blocks,
      mySignupIds
    ) as ParticipantDaySchedule[];
  },

  async toggleSignup(
    activityId: string,
    participantUserId: string
  ) {
    const activity = await db.scheduleActivity.findFirst({
      where: { id: activityId },
      include: { block: true },
    });
    if (!activity) throw new Error("Actividad no encontrada");
    if (activity.block.type !== "parallel")
      throw new Error("Solo se puede inscribir en actividades paralelas");

    const eventPerson = await db.eventPerson.findFirst({
      where: {
        event_id: activity.block.event_id,
        person: { self_user_id: participantUserId },
      },
      select: { id: true },
    });
    if (!eventPerson) throw new Error("No estás inscrito en este evento");

    const existing = await db.activitySignup.findUnique({
      where: {
        activity_id_event_person_id: {
          activity_id: activityId,
          event_person_id: eventPerson.id,
        },
      },
    });

    if (existing) {
      await db.activitySignup.delete({ where: { id: existing.id } });
      return { signed_up: false };
    }

    // One signup per block: remove any existing signup in this block
    const blockActivities = await db.scheduleActivity.findMany({
      where: { block_id: activity.block_id },
      select: { id: true },
    });

    await db.$transaction([
      db.activitySignup.deleteMany({
        where: {
          event_person_id: eventPerson.id,
          activity_id: { in: blockActivities.map((a) => a.id) },
        },
      }),
      db.activitySignup.create({
        data: {
          activity_id: activityId,
          event_person_id: eventPerson.id,
        },
      }),
    ]);

    return { signed_up: true };
  },

  async assignToActivity(
    activityId: string,
    eventPersonId: string,
    userId: string
  ) {
    const activity = await db.scheduleActivity.findFirst({
      where: { id: activityId, block: { event: { user_id: userId } } },
      include: { block: true },
    });
    if (!activity) throw new Error("Actividad no encontrada");
    if (activity.block.type !== "parallel")
      throw new Error("Solo se puede asignar en actividades paralelas");

    // One signup per block: remove existing, create new
    const blockActivities = await db.scheduleActivity.findMany({
      where: { block_id: activity.block_id },
      select: { id: true },
    });

    await db.$transaction([
      db.activitySignup.deleteMany({
        where: {
          event_person_id: eventPersonId,
          activity_id: { in: blockActivities.map((a) => a.id) },
        },
      }),
      db.activitySignup.create({
        data: {
          activity_id: activityId,
          event_person_id: eventPersonId,
        },
      }),
    ]);
  },

  async unassignFromActivity(
    activityId: string,
    eventPersonId: string,
    userId: string
  ) {
    const activity = await db.scheduleActivity.findFirst({
      where: { id: activityId, block: { event: { user_id: userId } } },
      select: { id: true },
    });
    if (!activity) throw new Error("Actividad no encontrada");

    await db.activitySignup.deleteMany({
      where: {
        activity_id: activityId,
        event_person_id: eventPersonId,
      },
    });
  },

  async getBlockAssignments(
    blockId: string,
    userId: string
  ): Promise<BlockAssignments> {
    const block = await db.scheduleBlock.findFirst({
      where: { id: blockId, event: { user_id: userId } },
      include: {
        activities: {
          orderBy: { position: "asc" },
          include: {
            signups: {
              include: {
                event_person: {
                  include: { person: { select: { name_display: true, name_initials: true } } },
                },
              },
            },
          },
        },
        event: { select: { id: true } },
      },
    });
    if (!block) throw new Error("Bloque no encontrado");

    // Get all confirmed event persons
    const confirmedPersons = await db.eventPerson.findMany({
      where: { event_id: block.event.id, status: "confirmed" },
      include: { person: { select: { name_display: true, name_initials: true } } },
    });

    // Collect all person IDs that have a signup in any activity of this block
    const assignedIds = new Set<string>();
    const activities = block.activities.map((act) => {
      const assigned = act.signups.map((s) => {
        assignedIds.add(s.event_person_id);
        return {
          id: s.event_person_id,
          name_display: s.event_person.person.name_display,
          name_initials: s.event_person.person.name_initials,
        };
      });
      return { id: act.id, title: act.title, assigned };
    });

    const unassigned = confirmedPersons
      .filter((ep) => !assignedIds.has(ep.id))
      .map((ep) => ({
        id: ep.id,
        name_display: ep.person.name_display,
        name_initials: ep.person.name_initials,
      }))
      .sort((a, b) => a.name_display.localeCompare(b.name_display));

    return { activities, unassigned };
  },
};
