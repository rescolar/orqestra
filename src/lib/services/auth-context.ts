import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";

export type AuthContext = {
  userId: string;
  role: UserRole;
};

export function ownershipFilter(ctx: AuthContext): { user_id?: string } {
  if (ctx.role === "admin") return {};
  return { user_id: ctx.userId };
}

export function isOwnerOrAdmin(ctx: AuthContext, ownerId: string): boolean {
  return ctx.role === "admin" || ctx.userId === ownerId;
}

/** Admin OR owner OR EventCollaborator */
export async function canAccessEvent(ctx: AuthContext, eventId: string): Promise<boolean> {
  if (ctx.role === "admin") return true;

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      user_id: true,
      collaborators: {
        where: { user_id: ctx.userId },
        select: { id: true },
      },
    },
  });
  if (!event) return false;

  return event.user_id === ctx.userId || event.collaborators.length > 0;
}

/** Admin OR owner only (not collaborators) */
export async function isEventOwner(ctx: AuthContext, eventId: string): Promise<boolean> {
  if (ctx.role === "admin") return true;

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { user_id: true },
  });
  return event?.user_id === ctx.userId;
}
