"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email requerido" };

  // Always return success to avoid revealing if email exists
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    return { success: true };
  }

  // Delete previous tokens for this email
  await db.passwordResetToken.deleteMany({ where: { email } });

  // Generate token
  const token = randomBytes(32).toString("base64url");
  const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { token, email, expires_at },
  });

  await sendPasswordResetEmail(email, token, user.name);

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!token || !password) return { error: "Datos incompletos" };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expires_at < new Date()) {
    return { error: "Enlace invalido o expirado" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.update({
    where: { email: record.email },
    data: { password: hashedPassword },
  });

  await db.passwordResetToken.delete({ where: { id: record.id } });

  return { success: true };
}
