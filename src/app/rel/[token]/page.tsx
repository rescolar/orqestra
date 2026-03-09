import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { RelationshipInviteService } from "@/lib/services/relationship-invite.service";
import { RelInviteClient } from "./rel-invite-client";
import Link from "next/link";

export default async function RelationshipInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await RelationshipInviteService.resolveToken(token);
  if (!invite) notFound();

  const session = await auth();

  const typeLabel = invite.relationship_type === "inseparable" ? "acompañante" : "preferida";

  // Expired or already resolved
  if (invite.expired || invite.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invitación no disponible</h1>
          <p className="text-muted-foreground">
            Esta invitación ha {invite.status === "accepted" ? "sido aceptada" : invite.status === "declined" ? "sido rechazada" : "expirado"}.
          </p>
        </div>
      </div>
    );
  }

  // Not logged in → show login + register links
  if (!session?.user?.id) {
    const cb = encodeURIComponent(`/rel/${token}`);
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invitación de compañero</h1>
          <p className="text-muted-foreground">
            <span className="font-semibold">{invite.senderName}</span> te invita como
            compañero/a {typeLabel} en{" "}
            <span className="font-semibold">{invite.event.name}</span>
          </p>
          <Link
            href={`/register?callbackUrl=${cb}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Registrarme para responder
          </Link>
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href={`/login?callbackUrl=${cb}`} className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Sender opened their own link → tell them to share it
  if (session.user.id === invite.sender_user_id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Tu invitación</h1>
          <p className="text-muted-foreground">
            Comparte este enlace con tu compañero/a para que acepte la invitación.
          </p>
          <Link
            href={`/my-events/${invite.event.id}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Volver a mi evento
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Invitación de compañero</h1>
        <p className="text-muted-foreground">
          <span className="font-semibold">{invite.senderName}</span> te invita como
          compañero/a {typeLabel} en{" "}
          <span className="font-semibold">{invite.event.name}</span>
        </p>
        {invite.event.location && (
          <p className="text-sm text-muted-foreground">{invite.event.location}</p>
        )}
        <RelInviteClient token={token} eventId={invite.event.id} />
      </div>
    </div>
  );
}
