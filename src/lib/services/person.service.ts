import { db } from "@/lib/db";
import { Gender } from "@prisma/client";

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
  async seedTestParticipants(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const existingCount = await db.eventPerson.count({
      where: { event_id: eventId },
    });
    if (existingCount > 0) return;

    for (const entry of TEST_PERSONS) {
      const person = await db.person.create({
        data: {
          user_id: userId,
          name_full: entry.name,
          name_display: getDisplayName(entry.name),
          name_initials: getInitials(entry.name),
          gender: entry.gender,
          default_role: "participant",
        },
      });

      await db.eventPerson.create({
        data: {
          event_id: eventId,
          person_id: person.id,
          role: "participant",
          status: "confirmed",
        },
      });
    }
  },

  async createParticipant(
    eventId: string,
    userId: string,
    data: { name_full: string; gender: Gender; role: "participant" | "facilitator" }
  ) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const person = await db.person.create({
      data: {
        user_id: userId,
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

  async getUnassignedPersons(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    return db.eventPerson.findMany({
      where: { event_id: eventId, room_id: null },
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
      orderBy: { person: { name_full: "asc" } },
    });
  },

  async assignPerson(eventPersonId: string, roomId: string, userId: string) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: {
        event: { select: { user_id: true } },
        person: { select: { gender: true } },
      },
    });
    if (!ep || ep.event.user_id !== userId) throw new Error("No encontrado");

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

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data: { room_id: roomId },
    });
  },

  async createParticipantsBatch(
    eventId: string,
    userId: string,
    names: string[]
  ) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const results = [];
    for (const name of names) {
      const person = await db.person.create({
        data: {
          user_id: userId,
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

  async unassignPerson(eventPersonId: string, userId: string) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: { event: { select: { user_id: true } } },
    });
    if (!ep || ep.event.user_id !== userId) throw new Error("No encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data: { room_id: null },
    });
  },

  async getEventPerson(eventPersonId: string, userId: string) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: {
        event: { select: { user_id: true } },
        person: {
          select: {
            name_full: true,
            name_display: true,
            name_initials: true,
            gender: true,
            contact_email: true,
            contact_phone: true,
            contact_address: true,
          },
        },
        room: {
          select: {
            display_name: true,
            internal_number: true,
          },
        },
      },
    });
    if (!ep || ep.event.user_id !== userId) throw new Error("No encontrado");
    return ep;
  },

  async updateEventPerson(
    eventPersonId: string,
    userId: string,
    data: {
      role?: "participant" | "facilitator";
      status?: "confirmed" | "tentative" | "cancelled";
      gender?: Gender;
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
      include: { event: { select: { user_id: true } } },
    });
    if (!ep || ep.event.user_id !== userId) throw new Error("No encontrado");

    const { gender, ...eventPersonData } = data;

    // Update gender on Person if changed
    if (gender !== undefined) {
      await db.person.update({
        where: { id: ep.person_id },
        data: { gender },
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

  async removeEventPerson(eventPersonId: string, userId: string) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: { event: { select: { user_id: true } } },
    });
    if (!ep || ep.event.user_id !== userId) throw new Error("No encontrado");

    return db.eventPerson.delete({
      where: { id: eventPersonId },
    });
  },
};
