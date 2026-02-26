"use server";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

const DEFAULT_AMENITIES = [
  { code: "wifi", label: "Wi-Fi", icon: "wifi" },
  { code: "heating", label: "Calefacción", icon: "thermostat" },
  { code: "ac", label: "Aire Acondicionado", icon: "ac_unit" },
  { code: "kitchen", label: "Cocina", icon: "kitchen" },
  { code: "private_bathroom", label: "Baño Privado", icon: "bathroom" },
  { code: "parking", label: "Parking", icon: "local_parking" },
  { code: "accessibility", label: "Accesibilidad", icon: "accessible" },
];

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

  const user = await db.user.create({
    data: { name, email, password: hashedPassword },
  });

  await db.amenity.createMany({
    data: DEFAULT_AMENITIES.map((a) => ({ ...a, user_id: user.id })),
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
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
