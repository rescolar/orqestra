import { db } from "@/lib/db";
import { ScheduleBlockType } from "@prisma/client";
import type { AuthContext } from "./auth-context";
import { canAccessEvent } from "./auth-context";

export type ScheduleActivityData = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  signup_count: number;
  max_participants: number | null;
  closed: boolean;
};

export type DaySchedule = {
  day_index: number;
  date: Date;
  blocks: {
    id: string;
    type: "common" | "parallel";
    position: number;
    time_label: string | null;
    activities: ScheduleActivityData[];
  }[];
};

export type ParticipantActivity = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  signup_count: number;
  max_participants: number | null;
  closed: boolean;
  my_signup: boolean;
};

export type ParticipantDaySchedule = {
  day_index: number;
  date: Date;
  blocks: {
    id: string;
    type: "common" | "parallel";
    position: number;
    time_label: string | null;
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
    time_label: string | null;
    activities: {
      id: string;
      title: string;
      description: string | null;
      position: number;
      max_participants: number | null;
      closed: boolean;
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
      time_label: block.time_label,
      activities: block.activities
        .sort((a, b) => a.position - b.position)
        .map((a) => {
          const base = {
            id: a.id,
            title: a.title,
            description: a.description,
            position: a.position,
            signup_count: a._count.signups,
            max_participants: a.max_participants,
            closed: a.closed,
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
    description: string | null;
    max_participants: number | null;
    closed: boolean;
    assigned: { id: string; name_display: string; name_initials: string }[];
  }[];
  unassigned: { id: string; name_display: string; name_initials: string }[];
};

export type PrintActivity = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  signup_count: number;
  max_participants: number | null;
  assigned_names: string[];
};

export type PrintDaySchedule = {
  day_index: number;
  date: Date;
  blocks: {
    id: string;
    type: "common" | "parallel";
    position: number;
    time_label: string | null;
    activities: PrintActivity[];
  }[];
};

export const ScheduleService = {
  async getSchedule(eventId: string, ctx: AuthContext): Promise<DaySchedule[]> {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");
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

    return buildDaySchedules(event, blocks);
  },

  async createBlock(
    eventId: string,
    ctx: AuthContext,
    data: { day_index: number; type: ScheduleBlockType }
  ) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

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
    ctx: AuthContext,
    direction: "up" | "down"
  ) {
    const block = await db.scheduleBlock.findUnique({
      where: { id: blockId },
    });
    if (!block) throw new Error("Bloque no encontrado");
    if (!(await canAccessEvent(ctx, block.event_id))) throw new Error("Bloque no encontrado");

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

  async deleteBlock(blockId: string, ctx: AuthContext) {
    const block = await db.scheduleBlock.findUnique({
      where: { id: blockId },
      select: { id: true, event_id: true },
    });
    if (!block) throw new Error("Bloque no encontrado");
    if (!(await canAccessEvent(ctx, block.event_id))) throw new Error("Bloque no encontrado");

    await db.scheduleBlock.delete({ where: { id: blockId } });
  },

  async createActivity(
    blockId: string,
    ctx: AuthContext,
    data: { title?: string }
  ) {
    const block = await db.scheduleBlock.findUnique({
      where: { id: blockId },
      include: { _count: { select: { activities: true } } },
    });
    if (!block) throw new Error("Bloque no encontrado");
    if (!(await canAccessEvent(ctx, block.event_id))) throw new Error("Bloque no encontrado");
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
    ctx: AuthContext,
    data: { title?: string; description?: string | null; max_participants?: number | null; closed?: boolean }
  ) {
    const activity = await db.scheduleActivity.findUnique({
      where: { id: activityId },
      select: { id: true, block: { select: { event_id: true } } },
    });
    if (!activity) throw new Error("Actividad no encontrada");
    if (!(await canAccessEvent(ctx, activity.block.event_id))) throw new Error("Actividad no encontrada");

    return db.scheduleActivity.update({
      where: { id: activityId },
      data,
    });
  },

  async deleteActivity(activityId: string, ctx: AuthContext) {
    const activity = await db.scheduleActivity.findUnique({
      where: { id: activityId },
      include: { block: { include: { _count: { select: { activities: true } } } } },
    });
    if (!activity) throw new Error("Actividad no encontrada");
    if (!(await canAccessEvent(ctx, activity.block.event_id))) throw new Error("Actividad no encontrada");

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
    if (activity.closed) throw new Error("Esta actividad está cerrada");
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
    ctx: AuthContext
  ) {
    const activity = await db.scheduleActivity.findUnique({
      where: { id: activityId },
      include: { block: true },
    });
    if (!activity) throw new Error("Actividad no encontrada");
    if (!(await canAccessEvent(ctx, activity.block.event_id))) throw new Error("Actividad no encontrada");
    if (activity.closed) throw new Error("Esta actividad está cerrada");
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
    ctx: AuthContext
  ) {
    const activity = await db.scheduleActivity.findUnique({
      where: { id: activityId },
      select: { id: true, block: { select: { event_id: true } } },
    });
    if (!activity) throw new Error("Actividad no encontrada");
    if (!(await canAccessEvent(ctx, activity.block.event_id))) throw new Error("Actividad no encontrada");

    await db.activitySignup.deleteMany({
      where: {
        activity_id: activityId,
        event_person_id: eventPersonId,
      },
    });
  },

  async updateBlock(
    blockId: string,
    ctx: AuthContext,
    data: { time_label?: string | null }
  ) {
    const block = await db.scheduleBlock.findUnique({
      where: { id: blockId },
      select: { id: true, event_id: true },
    });
    if (!block) throw new Error("Bloque no encontrado");
    if (!(await canAccessEvent(ctx, block.event_id))) throw new Error("Bloque no encontrado");

    return db.scheduleBlock.update({
      where: { id: blockId },
      data,
    });
  },

  async getBlockAssignments(
    blockId: string,
    ctx: AuthContext
  ): Promise<BlockAssignments> {
    const blockCheck = await db.scheduleBlock.findUnique({
      where: { id: blockId },
      select: { id: true, event_id: true },
    });
    if (!blockCheck) throw new Error("Bloque no encontrado");
    if (!(await canAccessEvent(ctx, blockCheck.event_id))) throw new Error("Bloque no encontrado");

    const block = await db.scheduleBlock.findUnique({
      where: { id: blockId },
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
      return {
        id: act.id,
        title: act.title,
        description: act.description,
        max_participants: act.max_participants,
        closed: act.closed,
        assigned,
      };
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

  async getSchedulePrintData(
    eventId: string,
    ctx: AuthContext
  ): Promise<PrintDaySchedule[]> {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");
    const event = await db.event.findFirst({
      where: { id: eventId },
      select: { date_start: true, date_end: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const blocks = await db.scheduleBlock.findMany({
      where: { event_id: eventId },
      include: {
        activities: {
          orderBy: { position: "asc" },
          include: {
            _count: { select: { signups: true } },
            signups: {
              include: {
                event_person: {
                  include: {
                    person: { select: { name_display: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ day_index: "asc" }, { position: "asc" }],
    });

    const start = new Date(event.date_start);
    const end = new Date(event.date_end);
    const dayCount =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const days: PrintDaySchedule[] = [];
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
        time_label: block.time_label,
        activities: block.activities.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          position: a.position,
          signup_count: a._count.signups,
          max_participants: a.max_participants,
          assigned_names: a.signups
            .map((s) => s.event_person.person.name_display)
            .sort((a, b) => a.localeCompare(b)),
        })),
      });
      day.blocks.sort((a, b) => a.position - b.position);
    }

    return days;
  },

  async confirmSchedule(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    // Get all activity IDs for this event
    const activities = await db.scheduleActivity.findMany({
      where: { block: { event_id: eventId } },
      select: { id: true },
    });
    const activityIds = activities.map((a) => a.id);

    await db.$transaction([
      db.event.update({
        where: { id: eventId },
        data: { schedule_confirmed: true },
      }),
      db.activitySignup.updateMany({
        where: { activity_id: { in: activityIds } },
        data: { confirmed: true },
      }),
    ]);
  },
};
