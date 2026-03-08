"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinAsCollaborator } from "@/lib/actions/collab";
import { Button } from "@/components/ui/button";

export function JoinCollabClient({
  code,
  eventId,
}: {
  code: string;
  eventId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleJoin() {
    startTransition(async () => {
      try {
        await joinAsCollaborator(code);
        router.push(`/events/${eventId}/board`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al unirse");
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        onClick={handleJoin}
        disabled={isPending}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isPending ? "Uniéndome..." : "Unirme como co-organizador"}
      </Button>
    </div>
  );
}
