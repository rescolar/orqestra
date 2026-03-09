import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { AuthContext } from "./auth-context";
import { isOwnerOrAdmin } from "./auth-context";

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
  async getOrCreateInviteCode(eventId: string, ctx: AuthContext): Promise<string> {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || !isOwnerOrAdmin(ctx, event.user_id)) {
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
          status: "inscrito",
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
    return db.person.findFirst({
      where: { self_user_id: participantUserId },
    });
  },

  async getParticipantEvents(participantUserId: string) {
    // Find ALL Persons linked to this participant (across multiple organizers)
    const persons = await db.person.findMany({
      where: { self_user_id: participantUserId },
    });
    if (persons.length === 0) return [];

    // Get events across all organizers that have this participant
    const personIds = persons.map((p) => p.id);
    const orgUserIds = persons.map((p) => p.user_id);

    const events = await db.event.findMany({
      where: {
        user_id: { in: orgUserIds },
        status: "active",
      },
      include: {
        event_persons: {
          where: { person_id: { in: personIds } },
          select: { id: true, status: true },
        },
        user: {
          select: { name: true, brand_name: true },
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
      organizerName: e.user.brand_name ?? e.user.name,
      isJoined: e.event_persons.length > 0,
      eventPersonId: e.event_persons[0]?.id ?? null,
      status: e.event_persons[0]?.status ?? null,
    }));
  },

  async joinEvent(participantUserId: string, eventId: string) {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Event not found");

    // Find person scoped to this event's organizer
    let person = await db.person.findFirst({
      where: { self_user_id: participantUserId, user_id: event.user_id },
    });

    // Auto-create Person if missing (Google OAuth creates User without Person)
    if (!person) {
      const user = await db.user.findUnique({ where: { id: participantUserId } });
      if (!user) throw new Error("User not found");

      person = await db.person.create({
        data: {
          user_id: event.user_id,
          self_user_id: participantUserId,
          name_full: user.name,
          name_display: computeDisplayName(user.name),
          name_initials: computeInitials(user.name),
          contact_email: user.email,
        },
      });
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
        status: "inscrito",
      },
    });
  },

  async isParticipantJoined(participantUserId: string, eventId: string) {
    const event = await db.event.findUnique({ where: { id: eventId }, select: { user_id: true } });
    if (!event) return false;

    const person = await db.person.findFirst({
      where: { self_user_id: participantUserId, user_id: event.user_id },
    });
    if (!person) return false;

    const ep = await db.eventPerson.findUnique({
      where: { event_id_person_id: { event_id: eventId, person_id: person.id } },
    });
    return !!ep;
  },

  async getEventPersonForParticipant(participantUserId: string, eventId: string) {
    const event = await db.event.findUnique({ where: { id: eventId }, select: { user_id: true } });
    if (!event) return null;

    const person = await db.person.findFirst({
      where: { self_user_id: participantUserId, user_id: event.user_id },
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
      status?: "solicita_cancelacion";
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

    // Participants can only set solicita_cancelacion (not cancelado or payment statuses)
    if (data.status && data.status !== "solicita_cancelacion") {
      throw new Error("Not authorized to set this status");
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
      discoverable?: boolean;
    }
  ) {
    // Update ALL Person records for this participant (across all organizers)
    const persons = await db.person.findMany({
      where: { self_user_id: participantUserId },
    });
    if (persons.length === 0) throw new Error("Person not found");

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

    // Update all Person records
    await db.person.updateMany({
      where: { self_user_id: participantUserId },
      data: updateData,
    });

    // Return the first one for the response
    return db.person.findFirst({
      where: { self_user_id: participantUserId },
    });
  },
};
