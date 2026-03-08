"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function getBranding() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      avatar_url: true,
      brand_name: true,
      brand_welcome_msg: true,
      brand_bg_color: true,
      brand_text_color: true,
      environment: true,
    },
  });

  return user;
}

export async function updateBranding(data: {
  brand_name?: string | null;
  brand_welcome_msg?: string | null;
  brand_bg_color?: string | null;
  brand_text_color?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.user.update({
    where: { id: session.user.id },
    data,
  });

  return { success: true };
}

export async function updateEnvironment(environment: "open" | "private") {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.user.update({
    where: { id: session.user.id },
    data: { environment },
  });

  return { success: true };
}
