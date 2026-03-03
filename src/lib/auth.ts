import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    Google,
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email!;
        const existingUser = await db.user.findUnique({ where: { email } });

        if (existingUser) {
          // Link Google ID if not yet linked
          if (!existingUser.google_id) {
            await db.user.update({
              where: { id: existingUser.id },
              data: { google_id: account.providerAccountId },
            });
          }
          // Overwrite the NextAuth user object so jwt callback gets the DB id/role
          user.id = existingUser.id;
          user.name = existingUser.name;
          (user as { role?: string }).role = existingUser.role;
          return true;
        }

        // No existing user with this email — block.
        // Google sign-in only works for users already registered via /join or /register.
        return false;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = ((user as { role?: string }).role ?? "organizer") as typeof token.role;
      }
      // Refresh role from DB on session update
      if (trigger === "update" && token.id) {
        const dbUser = await db.user.findUnique({ where: { id: token.id as string } });
        if (dbUser) token.role = dbUser.role as typeof token.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
