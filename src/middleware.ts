import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!login|register|join|join-collab|join-admin|rel|centro|forgot-password|reset-password|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
