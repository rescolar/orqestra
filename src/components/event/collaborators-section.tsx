"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeCollaborator } from "@/lib/actions/collab";
import { CollabLinkButton } from "./collab-link-button";

type Collaborator = {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export function CollaboratorsSection({
  eventId,
  collaborators,
  isOwner,
}: {
  eventId: string;
  collaborators: Collaborator[];
  isOwner: boolean;
}) {
  if (!isOwner) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Co-organizadores</h3>

      {collaborators.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {collaborators.map((c) => (
            <CollabChip
              key={c.id}
              eventId={eventId}
              userId={c.user.id}
              name={c.user.name}
              email={c.user.email}
            />
          ))}
        </div>
      )}

      {collaborators.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aún no hay co-organizadores. Genera un enlace para invitar a alguien.
        </p>
      )}

      <CollabLinkButton eventId={eventId} />
    </div>
  );
}

function CollabChip({
  eventId,
  userId,
  name,
  email,
}: {
  eventId: string;
  userId: string;
  name: string;
  email: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      await removeCollaborator(eventId, userId);
    });
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
      title={email}
    >
      {name}
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="rounded-full p-0.5 hover:bg-primary/20"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
