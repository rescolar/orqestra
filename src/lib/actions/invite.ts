"use server";

import { auth, signIn } from "@/lib/auth";
import { InviteService } from "@/lib/services/invite.service";
import { redirect } from "next/navigation";

export async function getInviteLink(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const code = await InviteService.getOrCreateInviteCode(eventId, session.user.id);
  return code;
}

export async function resolveInviteCode(code: string) {
  return InviteService.resolveInviteCode(code);
}

export async function registerParticipant(formData: FormData, code: string) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Todos los campos son obligatorios" };
  }

  const resolved = await InviteService.resolveInviteCode(code);
  if (!resolved) {
    return { error: "Enlace de invitación no válido" };
  }

  // Check if email already exists
  const { db } = await import("@/lib/db");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con este email. Inicia sesión." };
  }

  await InviteService.registerAndJoin(resolved.organizer.id, resolved.event.id, {
    name,
    email,
    password,
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: `/my-events/${resolved.event.id}`,
  });
}

export async function joinEventViaInvite(code: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const resolved = await InviteService.resolveInviteCode(code);
  if (!resolved) {
    return { error: "Enlace de invitación no válido" };
  }

  await InviteService.joinEvent(session.user.id, resolved.event.id);
  redirect(`/my-events/${resolved.event.id}`);
}
