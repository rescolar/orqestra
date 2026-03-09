import { db } from "@/lib/db";
import { Gender } from "@prisma/client";
import { UndoService } from "./undo.service";
import type { AuthContext } from "./auth-context";
import { ownershipFilter, canAccessEvent } from "./auth-context";

const TEST_PERSONS: { name: string; gender: Gender }[] = [
  { name: "María García", gender: "female" },
  { name: "Carlos López", gender: "male" },
  { name: "Ana Martínez", gender: "female" },
  { name: "Pedro Sánchez", gender: "male" },
  { name: "Laura Fernández", gender: "female" },
  { name: "Diego Rodríguez", gender: "male" },
  { name: "Sofía Hernández", gender: "female" },
  { name: "Javier Torres", gender: "male" },
  { name: "Elena Ruiz", gender: "female" },
  { name: "Miguel Díaz", gender: "male" },
  { name: "Lucía Moreno", gender: "female" },
  { name: "Andrés Jiménez", gender: "male" },
  { name: "Carmen Álvarez", gender: "female" },
  { name: "Pablo Romero", gender: "male" },
  { name: "Isabel Navarro", gender: "female" },
  { name: "Fernando Gil", gender: "male" },
  { name: "Marta Molina", gender: "female" },
  { name: "Raúl Serrano", gender: "male" },
  { name: "Patricia Blanco", gender: "female" },
  { name: "Tomás Castro", gender: "male" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getDisplayName(name: string): string {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

export const PersonService = {
  async getPersonsDirectory(ctx: AuthContext) {
    return db.person.findMany({
      where: ownershipFilter(ctx),
      select: {
        id: true,
        name_full: true,
        name_display: true,
        name_initials: true,
        gender: true,
        default_role: true,
        contact_email: true,
        contact_phone: true,
        dietary_requirements: true,
        allergies_text: true,
        _count: { select: { event_persons: true } },
      },
      orderBy: { name_full: "asc" },
    });
  },

  async getPersonCount(ctx: AuthContext) {
    return db.person.count({ where: ownershipFilter(ctx) });
  },

  async createPerson(
    userId: string,
    data: {
      name_full: string;
      gender: Gender;
      default_role: "participant" | "facilitator";
      contact_email?: string | null;
      contact_phone?: string | null;
      dietary_requirements?: string[];
      allergies_text?: string | null;
    }
  ) {
    return db.person.create({
      data: {
        user_id: userId,
        name_full: data.name_full,
        name_display: getDisplayName(data.name_full),
        name_initials: getInitials(data.name_full),
        gender: data.gender,
        default_role: data.default_role,
        contact_email: data.contact_email ?? null,
        contact_phone: data.contact_phone ?? null,
        dietary_requirements: data.dietary_requirements ?? [],
        allergies_text: data.allergies_text ?? null,
      },
    });
  },

  async updatePerson(
    personId: string,
    ctx: AuthContext,
    data: {
      name_full?: string;
      gender?: Gender;
      default_role?: "participant" | "facilitator";
      contact_email?: string | null;
      contact_phone?: string | null;
      dietary_requirements?: string[];
      allergies_text?: string | null;
    }
  ) {
    const person = await db.person.findFirst({
      where: { id: personId, ...ownershipFilter(ctx) },
      select: { id: true },
    });
    if (!person) throw new Error("Persona no encontrada");

    const updates: Record<string, unknown> = {};
    if (data.name_full !== undefined) {
      updates.name_full = data.name_full;
      updates.name_display = getDisplayName(data.name_full);
      updates.name_initials = getInitials(data.name_full);
    }
    if (data.gender !== undefined) updates.gender = data.gender;
    if (data.default_role !== undefined) updates.default_role = data.default_role;
    if (data.contact_email !== undefined) updates.contact_email = data.contact_email;
    if (data.contact_phone !== undefined) updates.contact_phone = data.contact_phone;
    if (data.dietary_requirements !== undefined) updates.dietary_requirements = data.dietary_requirements;
    if (data.allergies_text !== undefined) updates.allergies_text = data.allergies_text;

    return db.person.update({ where: { id: personId }, data: updates });
  },

  async deletePerson(personId: string, ctx: AuthContext) {
    const person = await db.person.findFirst({
      where: { id: personId, ...ownershipFilter(ctx) },
      select: { id: true },
    });
    if (!person) throw new Error("Persona no encontrada");

    return db.person.delete({ where: { id: personId } });
  },

  async seedTestParticipants(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, user_id: true },
    });

    const ownerId = event!.user_id;

    const [existingEventPersons, existingPersons] = await Promise.all([
      db.eventPerson.count({ where: { event_id: eventId } }),
      db.person.count({ where: { user_id: ownerId } }),
    ]);
    if (existingEventPersons > 0 || existingPersons > 0) return;

    for (let i = 0; i < TEST_PERSONS.length; i++) {
      const entry = TEST_PERSONS[i];
      const person = await db.person.create({
        data: {
          user_id: ownerId,
          name_full: entry.name,
          name_display: getDisplayName(entry.name),
          name_initials: getInitials(entry.name),
          gender: entry.gender,
          default_role: "participant",
        },
      });

      // Only first 5 get added to the event as EventPersons
      if (i < 5) {
        await db.eventPerson.create({
          data: {
            event_id: eventId,
            person_id: person.id,
            role: "participant",
            status: "confirmed",
          },
        });
      }
    }
  },

  async getAllPersonsForUser(ctx: AuthContext, eventId: string) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");
    // Get persons belonging to the event's owner
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { user_id: true },
    });
    let userFilter: { user_id: string } | Record<string, never> = {};
    if (ctx.role === "admin" || ctx.userId !== event!.user_id) {
      userFilter = { user_id: event!.user_id };
    } else {
      userFilter = { user_id: ctx.userId };
    }

    return db.person.findMany({
      where: userFilter,
      select: {
        id: true,
        name_full: true,
        name_display: true,
        name_initials: true,
        gender: true,
        default_role: true,
        event_persons: {
          where: { event_id: eventId },
          select: {
            id: true,
            role: true,
            room: {
              select: {
                display_name: true,
                internal_number: true,
              },
            },
          },
        },
      },
      orderBy: { name_full: "asc" },
    });
  },

  async addPersonToEvent(
    personId: string,
    ctx: AuthContext,
    eventId: string
  ) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");

    const person = await db.person.findFirst({
      where: { id: personId, ...(ctx.role === "admin" ? {} : { user_id: ctx.userId }) },
      select: { id: true, default_role: true },
    });
    if (!person) throw new Error("Persona no encontrada");

    const existing = await db.eventPerson.findFirst({
      where: { event_id: eventId, person_id: personId },
      select: { id: true },
    });
    if (existing) return existing;

    return db.eventPerson.create({
      data: {
        event_id: eventId,
        person_id: personId,
        role: person.default_role,
        status: "confirmed",
      },
    });
  },

  async addPersonToEventAndAssign(
    personId: string,
    roomId: string,
    ctx: AuthContext,
    eventId: string
  ) {
    // Verify event access
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");

    // Verify person access
    const person = await db.person.findFirst({
      where: { id: personId, ...(ctx.role === "admin" ? {} : { user_id: ctx.userId }) },
      select: { id: true, gender: true, default_role: true },
    });
    if (!person) throw new Error("Persona no encontrada");

    // Check person not already in event
    const existing = await db.eventPerson.findFirst({
      where: { event_id: eventId, person_id: personId },
      select: { id: true },
    });
    if (existing) throw new Error("Ya esta en el evento");

    // Validate room
    const room = await db.room.findFirst({
      where: { id: roomId, event_id: eventId },
      include: {
        event_persons: {
          select: { person: { select: { gender: true } } },
        },
      },
    });
    if (!room) throw new Error("Habitacion no encontrada");
    if (room.locked) throw new Error("Habitacion cerrada");

    // Gender restriction check
    if (room.gender_restriction !== "mixed" && person.gender !== "unknown") {
      const expected = room.gender_restriction === "women" ? "female" : "male";
      if (person.gender !== expected) {
        throw new Error("Restriccion de genero: no permitido");
      }
    }

    // Create EventPerson and assign to room
    return db.eventPerson.create({
      data: {
        event_id: eventId,
        person_id: personId,
        role: person.default_role,
        status: "confirmed",
        room_id: roomId,
      },
      include: {
        person: {
          select: {
            name_full: true,
            name_display: true,
            name_initials: true,
            gender: true,
          },
        },
      },
    });
  },

  async createParticipant(
    eventId: string,
    ctx: AuthContext,
    data: { name_full: string; gender: Gender; role: "participant" | "facilitator" }
  ) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, user_id: true },
    });

    const person = await db.person.create({
      data: {
        user_id: event!.user_id,
        name_full: data.name_full,
        name_display: getDisplayName(data.name_full),
        name_initials: getInitials(data.name_full),
        gender: data.gender,
        default_role: data.role,
      },
    });

    return db.eventPerson.create({
      data: {
        event_id: eventId,
        person_id: person.id,
        role: data.role,
        status: "confirmed",
      },
      include: {
        person: {
          select: {
            name_full: true,
            name_display: true,
            name_initials: true,
            gender: true,
          },
        },
      },
    });
  },

  async getUnassignedPersons(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");

    return db.eventPerson.findMany({
      where: { event_id: eventId, room_id: null },
      select: {
        id: true,
        role: true,
        status: true,
        inseparable_with_id: true,
        dietary_notified: true,
        requests_text: true,
        requests_managed: true,
        person: {
          select: {
            name_full: true,
            name_display: true,
            name_initials: true,
            gender: true,
            dietary_requirements: true,
            allergies_text: true,
          },
        },
      },
      orderBy: { person: { name_full: "asc" } },
    });
  },

  async assignPerson(eventPersonId: string, roomId: string, ctx: AuthContext) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: {
        event: { select: { id: true } },
        person: { select: { gender: true } },
      },
    });
    if (!ep || !(await canAccessEvent(ctx, ep.event.id))) throw new Error("No encontrado");

    const room = await db.room.findFirst({
      where: { id: roomId },
      include: {
        event_persons: {
          select: { person: { select: { gender: true } } },
        },
      },
    });
    if (!room) throw new Error("Habitación no encontrada");
    if (room.locked) throw new Error("Habitación cerrada");

    // Gender restriction check
    if (room.gender_restriction !== "mixed" && ep.person.gender !== "unknown") {
      const expected = room.gender_restriction === "women" ? "female" : "male";
      if (ep.person.gender !== expected) {
        throw new Error("Restricción de género: no permitido");
      }
    }

    const previousRoomId = ep.room_id;
    const result = await db.eventPerson.update({
      where: { id: eventPersonId },
      data: { room_id: roomId },
    });

    // Record undo entry
    const batchId = crypto.randomUUID();
    await UndoService.record(ep.event_id, batchId, "assign_person", {
      eventPersonId,
      previousRoomId,
    });

    return result;
  },

  async createParticipantsBatch(
    eventId: string,
    ctx: AuthContext,
    names: string[]
  ) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, user_id: true },
    });

    const results = [];
    for (const name of names) {
      const person = await db.person.create({
        data: {
          user_id: event!.user_id,
          name_full: name,
          name_display: getDisplayName(name),
          name_initials: getInitials(name),
          gender: "unknown",
          default_role: "participant",
        },
      });

      const ep = await db.eventPerson.create({
        data: {
          event_id: eventId,
          person_id: person.id,
          role: "participant",
          status: "confirmed",
        },
        include: {
          person: {
            select: {
              name_full: true,
              name_display: true,
              name_initials: true,
              gender: true,
            },
          },
        },
      });
      results.push(ep);
    }
    return results;
  },

  async unassignPerson(eventPersonId: string, ctx: AuthContext) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: { event: { select: { id: true } } },
    });
    if (!ep || !(await canAccessEvent(ctx, ep.event.id))) throw new Error("No encontrado");

    const previousRoomId = ep.room_id;
    const result = await db.eventPerson.update({
      where: { id: eventPersonId },
      data: { room_id: null },
    });

    // Record undo entry
    if (previousRoomId) {
      const batchId = crypto.randomUUID();
      await UndoService.record(ep.event_id, batchId, "assign_person", {
        eventPersonId,
        previousRoomId,
      });
    }

    return result;
  },

  async getEventPerson(eventPersonId: string, ctx: AuthContext) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: {
        event: { select: { id: true } },
        person: {
          select: {
            id: true,
            name_full: true,
            name_display: true,
            name_initials: true,
            gender: true,
            contact_email: true,
            contact_phone: true,
            contact_address: true,
            avatar_url: true,
            dietary_requirements: true,
            allergies_text: true,
          },
        },
        room: {
          select: {
            display_name: true,
            internal_number: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                id: true,
                inseparable_with_id: true,
                person: {
                  select: {
                    name_display: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!ep || !(await canAccessEvent(ctx, ep.event.id))) throw new Error("No encontrado");
    return ep;
  },

  async updateEventPerson(
    eventPersonId: string,
    ctx: AuthContext,
    data: {
      role?: "participant" | "facilitator";
      status?: "confirmed" | "tentative" | "cancelled";
      gender?: Gender;
      contact_email?: string | null;
      contact_phone?: string | null;
      contact_address?: string | null;
      dietary_requirements?: string[];
      dietary_notified?: boolean;
      allergies_text?: string | null;
      requests_text?: string | null;
      requests_managed?: boolean;
      move_with_partner?: boolean;
    }
  ) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: { event: { select: { id: true } } },
    });
    if (!ep || !(await canAccessEvent(ctx, ep.event.id))) throw new Error("No encontrado");

    const {
      gender,
      contact_email,
      contact_phone,
      contact_address,
      dietary_requirements,
      allergies_text,
      ...eventPersonData
    } = data;

    // Update Person-level fields if changed (identity + dietary)
    const personUpdates: Record<string, unknown> = {};
    if (gender !== undefined) personUpdates.gender = gender;
    if (contact_email !== undefined) personUpdates.contact_email = contact_email;
    if (contact_phone !== undefined) personUpdates.contact_phone = contact_phone;
    if (contact_address !== undefined) personUpdates.contact_address = contact_address;
    if (dietary_requirements !== undefined) personUpdates.dietary_requirements = dietary_requirements;
    if (allergies_text !== undefined) personUpdates.allergies_text = allergies_text;

    if (Object.keys(personUpdates).length > 0) {
      await db.person.update({
        where: { id: ep.person_id },
        data: personUpdates,
      });
    }

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data: eventPersonData,
      include: {
        person: {
          select: {
            name_full: true,
            name_display: true,
            name_initials: true,
            gender: true,
          },
        },
      },
    });
  },

  async addAllPersonsToEvent(eventId: string, ctx: AuthContext) {
    if (!(await canAccessEvent(ctx, eventId)))
      throw new Error("Evento no encontrado");
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, user_id: true },
    });

    const persons = await db.person.findMany({
      where: {
        user_id: event!.user_id,
        event_persons: { none: { event_id: eventId } },
      },
      select: { id: true, default_role: true },
    });

    if (persons.length === 0) return { added: 0 };

    await db.eventPerson.createMany({
      data: persons.map((p) => ({
        event_id: eventId,
        person_id: p.id,
        role: p.default_role,
        status: "confirmed" as const,
      })),
    });

    return { added: persons.length };
  },

  async removeEventPerson(eventPersonId: string, ctx: AuthContext) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: { event: { select: { id: true } } },
    });
    if (!ep || !(await canAccessEvent(ctx, ep.event.id))) throw new Error("No encontrado");

    return db.eventPerson.delete({
      where: { id: eventPersonId },
    });
  },
};
