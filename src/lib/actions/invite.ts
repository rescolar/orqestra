"use server";

import { auth, signIn } from "@/lib/auth";
import { InviteService } from "@/lib/services/invite.service";
import { redirect } from "next/navigation";

export async function getInviteLink() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const code = await InviteService.getOrCreateInviteCode(session.user.id);
  return code;
}

export async function resolveInviteCode(code: string) {
  return InviteService.getOrganizerByInviteCode(code);
}

export async function registerParticipant(formData: FormData, code: string) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Todos los campos son obligatorios" };
  }

  const organizer = await InviteService.getOrganizerByInviteCode(code);
  if (!organizer) {
    return { error: "Enlace de invitación no válido" };
  }

  // Check if email already exists
  const { db } = await import("@/lib/db");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con este email. Inicia sesión." };
  }

  await InviteService.registerParticipant(organizer.id, { name, email, password });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/my-profile",
  });
}
