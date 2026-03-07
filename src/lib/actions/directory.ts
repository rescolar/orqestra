"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PersonService } from "@/lib/services/person.service";
import type { Gender } from "@prisma/client";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function getPersonsDirectory() {
  const ctx = await requireAuth();
  return PersonService.getPersonsDirectory(ctx);
}

export async function getPersonCount() {
  const ctx = await requireAuth();
  return PersonService.getPersonCount(ctx);
}

export async function createPerson(data: {
  name_full: string;
  gender: Gender;
  default_role: "participant" | "facilitator";
  contact_email?: string | null;
  contact_phone?: string | null;
  dietary_requirements?: string[];
  allergies_text?: string | null;
}) {
  const ctx = await requireAuth();
  await PersonService.createPerson(ctx.userId, data);
  revalidatePath("/persons");
  revalidatePath("/dashboard");
}

export async function updatePerson(
  personId: string,
  data: {
    name_full?: string;
    gender?: Gender;
    default_role?: "participant" | "facilitator";
    contact_email?: string | null;
    contact_phone?: string | null;
    dietary_requirements?: string[];
    allergies_text?: string | null;
  }
) {
  const ctx = await requireAuth();
  await PersonService.updatePerson(personId, ctx, data);
  revalidatePath("/persons");
}

export async function deletePerson(personId: string) {
  const ctx = await requireAuth();
  await PersonService.deletePerson(personId, ctx);
  revalidatePath("/persons");
  revalidatePath("/dashboard");
}
