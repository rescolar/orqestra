"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminService } from "@/lib/services/admin.service";
import { AdminInviteService } from "@/lib/services/admin-invite.service";
import type { UserRole } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  return session.user;
}

export async function getAdminStats() {
  await requireAdmin();
  return AdminService.getStats();
}

export async function getAllUsers() {
  await requireAdmin();
  return AdminService.getAllUsers();
}

export async function getAllEvents(organizerUserId?: string) {
  await requireAdmin();
  return AdminService.getAllEvents(organizerUserId);
}

export async function updateUserRole(userId: string, role: UserRole) {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    throw new Error("No puedes cambiar tu propio rol");
  }
  await AdminService.updateUserRole(userId, role);
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    throw new Error("No puedes eliminarte a ti mismo");
  }
  await AdminService.deleteUser(userId);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function adminDeleteEvent(eventId: string) {
  await requireAdmin();
  await AdminService.deleteEvent(eventId);
  revalidatePath("/admin/events");
  revalidatePath("/admin");
}

export async function createAdminInviteToken() {
  const admin = await requireAdmin();
  return AdminInviteService.createToken(admin.id);
}

export async function resolveAdminToken(token: string) {
  return AdminInviteService.resolveToken(token);
}

export async function consumeAdminToken(token: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await AdminInviteService.consumeToken(token, session.user.id);
}
