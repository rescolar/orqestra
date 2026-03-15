import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventService } from "@/lib/services/event.service";
import { CollabService } from "@/lib/services/collab.service";
import { CollaboratorsSection } from "@/components/event/collaborators-section";
import { DiscoveryToggle } from "@/components/event/discovery-toggle";

export default async function CollaboratorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const ctx = { userId: session.user.id, role: session.user.role };
  const event = await EventService.getEventForDetail(id, ctx);

  if (!event) notFound();

  const collaborators = event.isOwner
    ? await CollabService.getCollaborators(id)
    : [];

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href={`/events/${id}/detail`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Volver al evento
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-gray-900">Co-organizadores</h1>

        <div className="space-y-6 rounded-2xl border bg-white p-6">
          <CollaboratorsSection
            eventId={id}
            collaborators={collaborators}
            isOwner={event.isOwner}
          />
          {event.isOwner && (
            <DiscoveryToggle
              eventId={id}
              initial={event.participant_discovery}
            />
          )}
        </div>
      </div>
    </div>
  );
}
