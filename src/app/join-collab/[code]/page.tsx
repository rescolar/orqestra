import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { CollabService } from "@/lib/services/collab.service";
import { JoinCollabClient } from "./join-collab-client";
import Link from "next/link";

export default async function JoinCollabPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await CollabService.resolveCollabCode(code);
  if (!data) notFound();

  const session = await auth();

  // Not logged in → show login prompt
  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Co-organizar evento</h1>
          <p className="text-muted-foreground">
            <span className="font-semibold">{data.organizer.name}</span> te invita a
            co-organizar <span className="font-semibold">{data.event.name}</span>
          </p>
          <Link
            href={`/login?callbackUrl=/join-collab/${code}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Iniciar sesión para continuar
          </Link>
        </div>
      </div>
    );
  }

  // Already a collaborator → redirect
  const isCollab = await CollabService.isCollaborator(data.event.id, session.user.id);
  if (isCollab) redirect(`/events/${data.event.id}/board`);

  // Owner → redirect
  if (data.organizer.id === session.user.id) redirect(`/events/${data.event.id}/board`);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Co-organizar evento</h1>
        <p className="text-muted-foreground">
          <span className="font-semibold">{data.organizer.name}</span> te invita a
          co-organizar <span className="font-semibold">{data.event.name}</span>
        </p>
        {data.event.location && (
          <p className="text-sm text-muted-foreground">{data.event.location}</p>
        )}
        <JoinCollabClient code={code} eventId={data.event.id} />
      </div>
    </div>
  );
}
