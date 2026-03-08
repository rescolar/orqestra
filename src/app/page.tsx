import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  if (session.user.role === "participant") {
    // Check if participant has collaborations → send to dashboard
    const collabCount = await db.eventCollaborator.count({
      where: { user_id: session.user.id },
    });
    if (collabCount > 0) redirect("/dashboard");
    redirect("/my-events");
  }

  redirect("/dashboard");
}
