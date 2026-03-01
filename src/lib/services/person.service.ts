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
};
