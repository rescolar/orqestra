import { db } from "@/lib/db";
import crypto from "crypto";
import type { AuthContext } from "./auth-context";
import { isOwnerOrAdmin } from "./auth-context";

function generateCollabCode(): string {
  return crypto.randomBytes(8).toString("base64url"); // ~11 chars, URL-safe
}

export const CollabService = {
  async getOrCreateCollabCode(eventId: string, ctx: AuthContext): Promise<string> {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || !isOwnerOrAdmin(ctx, event.user_id)) {
      throw new Error("Event not found or not owned by user");
    }
    if (event.collab_invite_code) return event.collab_invite_code;

    const code = generateCollabCode();
    await db.event.update({
      where: { id: eventId },
      data: { collab_invite_code: code },
    });
    return code;
  },

  async resolveCollabCode(code: string) {
    const event = await db.event.findUnique({
      where: { collab_invite_code: code },
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
            brand_name: true,
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
      organizer: {
        id: event.user.id,
        name: event.user.brand_name ?? event.user.name,
      },
    };
  },

  async joinAsCollaborator(userId: string, code: string) {
    const event = await db.event.findUnique({
      where: { collab_invite_code: code },
      select: { id: true, user_id: true },
    });
    if (!event) throw new Error("Invalid code");
    if (event.user_id === userId) throw new Error("You are the owner");

    // Check if already a collaborator
    const existing = await db.eventCollaborator.findUnique({
      where: { event_id_user_id: { event_id: event.id, user_id: userId } },
    });
    if (existing) return { eventId: event.id, alreadyJoined: true };

    await db.eventCollaborator.create({
      data: { event_id: event.id, user_id: userId },
    });
    return { eventId: event.id, alreadyJoined: false };
  },

  async getCollaborators(eventId: string) {
    return db.eventCollaborator.findMany({
      where: { event_id: eventId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async removeCollaborator(eventId: string, userId: string, ctx: AuthContext) {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || !isOwnerOrAdmin(ctx, event.user_id)) {
      throw new Error("Only the owner can remove collaborators");
    }

    await db.eventCollaborator.delete({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } },
    });
  },

  async isCollaborator(eventId: string, userId: string): Promise<boolean> {
    const collab = await db.eventCollaborator.findUnique({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } },
    });
    return !!collab;
  },
};
