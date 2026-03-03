import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Edge-compatible auth config (no Prisma, no bcrypt).
// Used by middleware for lightweight JWT session checks.
// The full authorize logic lives in auth.ts (server-only).
export const authConfig: NextAuthConfig = {
  providers: [
    // Credentials provider stub — authorize is overridden in auth.ts
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    }),
    Google,
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: string }).role as typeof token.role ?? "organizer";
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
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Public routes don't require auth
      if (pathname.startsWith("/join")) return true;

      if (!isLoggedIn) return false;

      const role = auth?.user?.role;

      // Participant trying to access organizer routes
      if (role === "participant") {
        const organizerRoutes = ["/dashboard", "/events", "/persons"];
        if (organizerRoutes.some((r) => pathname.startsWith(r))) {
          return Response.redirect(new URL("/my-events", request.nextUrl));
        }
      }

      // Organizer/admin trying to access participant routes
      if (role !== "participant") {
        if (pathname.startsWith("/my-events") || pathname.startsWith("/my-profile")) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
};
