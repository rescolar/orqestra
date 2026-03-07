import type { UserRole } from "@prisma/client";

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
