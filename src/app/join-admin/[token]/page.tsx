import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { AdminInviteService } from "@/lib/services/admin-invite.service";
import { JoinAdminClient } from "./join-admin-client";
import Link from "next/link";

export default async function JoinAdminPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await AdminInviteService.resolveToken(token);
  if (!record) notFound();

  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invitación de administrador</h1>
          <p className="text-muted-foreground">
            Has sido invitado como administrador de Ordenaia.
          </p>
          <Link
            href={`/login?callbackUrl=/join-admin/${token}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Iniciar sesión para continuar
          </Link>
        </div>
      </div>
    );
  }

  if (session.user.role === "admin") {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Invitación de administrador</h1>
        <p className="text-muted-foreground">
          ¿Deseas convertirte en administrador de Ordenaia?
        </p>
        <JoinAdminClient token={token} />
      </div>
    </div>
  );
}
