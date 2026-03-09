import { db } from "@/lib/db";
import crypto from "crypto";
import type { RelationshipType } from "@prisma/client";

export const RelationshipInviteService = {
  async createInvite(
    senderUserId: string,
    eventId: string,
    type: RelationshipType
  ) {
    // Validate sender is a participant in this event
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { user_id: true, date_start: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const senderPerson = await db.person.findFirst({
      where: { self_user_id: senderUserId, user_id: event.user_id },
    });
    if (!senderPerson) throw new Error("No eres participante de este evento");

    const senderEp = await db.eventPerson.findUnique({
      where: { event_id_person_id: { event_id: eventId, person_id: senderPerson.id } },
    });
    if (!senderEp) throw new Error("No eres participante de este evento");

    // If inseparable, check sender doesn't already have one in this event
    if (type === "inseparable" && senderEp.inseparable_with_id) {
      throw new Error("Ya tienes un compañero inseparable en este evento");
    }

    const token = crypto.randomBytes(16).toString("base64url");

    return db.relationshipInvite.create({
      data: {
        event_id: eventId,
        sender_user_id: senderUserId,
        relationship_type: type,
        token,
        expires_at: event.date_start,
      },
    });
  },

  async resolveToken(token: string) {
    const invite = await db.relationshipInvite.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            date_start: true,
            date_end: true,
            location: true,
            user_id: true,
          },
        },
      },
    });
    if (!invite) return null;

    // Get sender info
    const senderUser = await db.user.findUnique({
      where: { id: invite.sender_user_id },
      select: { name: true },
    });
    const senderName = senderUser?.name ?? "Alguien";

    if (invite.status !== "pending") return { ...invite, expired: true, senderName };
    if (invite.expires_at < new Date()) return { ...invite, expired: true, senderName };

    return {
      ...invite,
      expired: false,
      senderName,
    };
  },

  async acceptInvite(token: string, recipientUserId: string) {
    const invite = await db.relationshipInvite.findUnique({
      where: { token },
      include: {
        event: { select: { id: true, user_id: true } },
      },
    });
    if (!invite || invite.status !== "pending") throw new Error("Invitación no válida");
    if (invite.expires_at < new Date()) throw new Error("Invitación expirada");

    const eventId = invite.event.id;
    const orgUserId = invite.event.user_id;

    // Ensure recipient has a Person in this organizer's directory + is joined to event
    let recipientPerson = await db.person.findFirst({
      where: { self_user_id: recipientUserId, user_id: orgUserId },
    });

    if (!recipientPerson) {
      const recipientUser = await db.user.findUnique({ where: { id: recipientUserId } });
      if (!recipientUser) throw new Error("Usuario no encontrado");

      recipientPerson = await db.person.create({
        data: {
          user_id: orgUserId,
          self_user_id: recipientUserId,
          name_full: recipientUser.name,
          name_display: recipientUser.name.split(/\s+/).length > 1
            ? `${recipientUser.name.split(/\s+/)[0]} ${recipientUser.name.split(/\s+/).pop()?.[0]}.`
            : recipientUser.name,
          name_initials: recipientUser.name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3),
          contact_email: recipientUser.email,
        },
      });
    }

    // Join event if not already
    let recipientEp = await db.eventPerson.findUnique({
      where: { event_id_person_id: { event_id: eventId, person_id: recipientPerson.id } },
    });
    if (!recipientEp) {
      recipientEp = await db.eventPerson.create({
        data: {
          event_id: eventId,
          person_id: recipientPerson.id,
          role: "participant",
          status: "inscrito",
        },
      });
    }

    // Find sender's EventPerson
    const senderPerson = await db.person.findFirst({
      where: { self_user_id: invite.sender_user_id, user_id: orgUserId },
    });
    if (!senderPerson) throw new Error("Sender person not found");

    const senderEp = await db.eventPerson.findUnique({
      where: { event_id_person_id: { event_id: eventId, person_id: senderPerson.id } },
    });
    if (!senderEp) throw new Error("Sender not in event");

    // Set inseparable relationship if type is inseparable
    if (invite.relationship_type === "inseparable") {
      await db.$transaction([
        db.eventPerson.update({
          where: { id: senderEp.id },
          data: { inseparable_with_id: recipientEp.id },
        }),
        db.eventPerson.update({
          where: { id: recipientEp.id },
          data: { inseparable_with_id: senderEp.id },
        }),
      ]);
    }

    // Mark invite as accepted
    await db.relationshipInvite.update({
      where: { id: invite.id },
      data: {
        status: "accepted",
        recipient_user_id: recipientUserId,
        resolved_at: new Date(),
      },
    });

    return { eventId };
  },

  async declineInvite(token: string, recipientUserId: string) {
    const invite = await db.relationshipInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "pending") throw new Error("Invitación no válida");

    await db.relationshipInvite.update({
      where: { id: invite.id },
      data: {
        status: "declined",
        recipient_user_id: recipientUserId,
        resolved_at: new Date(),
      },
    });
  },

  async getInvitesByEvent(eventId: string, senderUserId: string) {
    return db.relationshipInvite.findMany({
      where: { event_id: eventId, sender_user_id: senderUserId },
      orderBy: { created_at: "desc" },
    });
  },
};
