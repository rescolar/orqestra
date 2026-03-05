import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function generateInviteCode(): string {
  return crypto.randomBytes(6).toString("base64url"); // ~8 chars, URL-safe
}

function computeInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

function computeDisplayName(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export const InviteService = {
  async getOrCreateInviteCode(eventId: string, userId: string): Promise<string> {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.user_id !== userId) {
      throw new Error("Event not found or not owned by user");
    }
    if (event.invite_code) return event.invite_code;

    const code = generateInviteCode();
    await db.event.update({
      where: { id: eventId },
      data: { invite_code: code },
    });
    return code;
  },

  async resolveInviteCode(code: string) {
    const event = await db.event.findUnique({
      where: { invite_code: code },
      select: {
        id: true,
        name: true,
        date_start: true,
        date_end: true,
        location: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            brand_name: true,
            brand_welcome_msg: true,
            brand_bg_color: true,
            brand_text_color: true,
          },
        },
      },
    });
    if (!event) return null;
    return {
      event: {
        id: event.id,
        name: event.name,
        date_start: event.date_start,
        date_end: event.date_end,
        location: event.location,
      },
      organizer: event.user,
    };
  },

  async registerAndJoin(
    organizerId: string,
    eventId: string,
    data: { name: string; email: string; password: string }
  ) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return db.$transaction(async (tx) => {
      // Create participant user
      const participantUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: "participant",
        },
      });

      // Create Person in organizer's directory linked to participant
      const person = await tx.person.create({
        data: {
          user_id: organizerId,
          self_user_id: participantUser.id,
          name_full: data.name,
          name_display: computeDisplayName(data.name),
          name_initials: computeInitials(data.name),
          contact_email: data.email,
        },
      });

      // Auto-join the event
      await tx.eventPerson.create({
        data: {
          event_id: eventId,
          person_id: person.id,
          role: "participant",
          status: "confirmed",
        },
      });

      return participantUser;
    });
  },

  async registerParticipantGoogle(
    organizerUserId: string,
    data: { name: string; email: string; googleId: string }
  ) {
    return db.$transaction(async (tx) => {
      const participantUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          google_id: data.googleId,
          role: "participant",
        },
      });

      await tx.person.create({
        data: {
          user_id: organizerUserId,
          self_user_id: participantUser.id,
          name_full: data.name,
          name_display: computeDisplayName(data.name),
          name_initials: computeInitials(data.name),
          contact_email: data.email,
        },
      });

      return participantUser;
    });
  },

  async getParticipantPerson(participantUserId: string) {
    return db.person.findUnique({
      where: { self_user_id: participantUserId },
    });
  },

  async getParticipantEvents(participantUserId: string) {
    // Find the Person linked to this participant
    const person = await db.person.findUnique({
      where: { self_user_id: participantUserId },
    });
    if (!person) return [];

    // Get events from the organizer that owns this Person
    const events = await db.event.findMany({
      where: {
        user_id: person.user_id,
        status: "active",
      },
      include: {
        event_persons: {
          where: { person_id: person.id },
          select: { id: true, status: true },
        },
      },
      orderBy: { date_start: "asc" },
    });

    return events.map((e) => ({
      id: e.id,
      name: e.name,
      date_start: e.date_start,
      date_end: e.date_end,
      location: e.location,
      description: e.description,
      image_url: e.image_url,
      isJoined: e.event_persons.length > 0,
      eventPersonId: e.event_persons[0]?.id ?? null,
      status: e.event_persons[0]?.status ?? null,
    }));
  },

  async joinEvent(participantUserId: string, eventId: string) {
    const person = await db.person.findUnique({
      where: { self_user_id: participantUserId },
    });
    if (!person) throw new Error("Person not found for participant");

    // Verify event belongs to the same organizer
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.user_id !== person.user_id) {
      throw new Error("Event not accessible");
    }

    // Check if already joined
    const existing = await db.eventPerson.findUnique({
      where: { event_id_person_id: { event_id: eventId, person_id: person.id } },
    });
    if (existing) return existing;

    return db.eventPerson.create({
      data: {
        event_id: eventId,
        person_id: person.id,
        role: "participant",
        status: "confirmed",
      },
    });
  },

  async isParticipantJoined(participantUserId: string, eventId: string) {
    const person = await db.person.findUnique({
      where: { self_user_id: participantUserId },
    });
    if (!person) return false;

    const ep = await db.eventPerson.findUnique({
      where: { event_id_person_id: { event_id: eventId, person_id: person.id } },
    });
    return !!ep;
  },

  async getEventPersonForParticipant(participantUserId: string, eventId: string) {
    const person = await db.person.findUnique({
      where: { self_user_id: participantUserId },
    });
    if (!person) return null;

    return db.eventPerson.findUnique({
      where: { event_id_person_id: { event_id: eventId, person_id: person.id } },
      include: {
        event: {
          select: { id: true, name: true, date_start: true, date_end: true, location: true },
        },
        person: {
          select: {
            dietary_requirements: true,
            allergies_text: true,
          },
        },
      },
    });
  },

  async updateEventPreferences(
    participantUserId: string,
    eventPersonId: string,
    data: {
      status?: "confirmed" | "tentative" | "cancelled";
      arrives_for_dinner?: boolean;
      last_meal_lunch?: boolean;
      requests_text?: string;
    }
  ) {
    // Verify ownership
    const ep = await db.eventPerson.findUnique({
      where: { id: eventPersonId },
      include: { person: { select: { self_user_id: true } } },
    });
    if (!ep || ep.person.self_user_id !== participantUserId) {
      throw new Error("Not authorized");
    }

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data,
    });
  },

  async updateParticipantProfile(
    participantUserId: string,
    data: {
      name_full?: string;
      gender?: "unknown" | "female" | "male" | "other";
      contact_email?: string;
      contact_phone?: string;
      dietary_requirements?: string[];
      allergies_text?: string | null;
    }
  ) {
    const person = await db.person.findUnique({
      where: { self_user_id: participantUserId },
    });
    if (!person) throw new Error("Person not found");

    const updateData: Record<string, unknown> = { ...data };

    // Recompute display/initials if name changed
    if (data.name_full) {
      updateData.name_display = computeDisplayName(data.name_full);
      updateData.name_initials = computeInitials(data.name_full);
      // Also update User name
      await db.user.update({
        where: { id: participantUserId },
        data: { name: data.name_full },
      });
    }

    return db.person.update({
      where: { id: person.id },
      data: updateData,
    });
  },
};
