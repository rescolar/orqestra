import { db } from "@/lib/db";
import crypto from "crypto";

const TOKEN_TTL_DAYS = 7;

export const AdminInviteService = {
  async createToken(createdByUserId: string): Promise<string> {
    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

    await db.adminInviteToken.create({
      data: {
        token,
        created_by: createdByUserId,
        expires_at: expiresAt,
      },
    });
    return token;
  },

  async resolveToken(token: string) {
    const record = await db.adminInviteToken.findUnique({
      where: { token },
    });
    if (!record) return null;
    if (record.expires_at < new Date()) return null;
    return record;
  },

  async consumeToken(token: string, userId: string) {
    const record = await this.resolveToken(token);
    if (!record) throw new Error("Token inválido o expirado");

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { role: "admin" },
      }),
      db.adminInviteToken.delete({
        where: { id: record.id },
      }),
    ]);
  },
};
