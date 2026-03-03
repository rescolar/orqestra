"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PersonService } from "@/lib/services/person.service";
import type { Gender } from "@prisma/client";

export async function getPersonsDirectory() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return PersonService.getPersonsDirectory(session.user.id);
}

export async function getPersonCount() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return PersonService.getPersonCount(session.user.id);
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.createPerson(session.user.id, data);
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.updatePerson(personId, session.user.id, data);
  revalidatePath("/persons");
}

export async function deletePerson(personId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await PersonService.deletePerson(personId, session.user.id);
  revalidatePath("/persons");
  revalidatePath("/dashboard");
}
