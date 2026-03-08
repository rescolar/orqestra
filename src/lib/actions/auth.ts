"use server";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Todos los campos son obligatorios" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con este email" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.create({
    data: { name, email, password: hashedPassword, role: "organizer" },
  });

  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";

  await signIn("credentials", {
    email,
    password,
    redirectTo: callbackUrl,
  });
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios" };
  }

  try {
    const callbackUrl = formData.get("callbackUrl") as string;
    // Use callbackUrl if provided, otherwise redirect based on role
    let redirectTo = callbackUrl;
    if (!redirectTo) {
      const user = await db.user.findUnique({ where: { email } });
      redirectTo = user?.role === "participant" ? "/my-events" : "/dashboard";
    }

    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { error: "Email o contraseña incorrectos" };
  }
}
