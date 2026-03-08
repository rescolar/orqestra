"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptRelationshipInvite,
  declineRelationshipInvite,
} from "@/lib/actions/relationship-invite";
import { Button } from "@/components/ui/button";

export function RelInviteClient({
  token,
  eventId,
}: {
  token: string;
  eventId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    startTransition(async () => {
      try {
        await acceptRelationshipInvite(token);
        router.push(`/my-events/${eventId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aceptar");
      }
    });
  }

  function handleDecline() {
    startTransition(async () => {
      try {
        await declineRelationshipInvite(token);
        router.push("/my-events");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al rechazar");
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        onClick={handleAccept}
        disabled={isPending}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isPending ? "Procesando..." : "Aceptar"}
      </Button>
      <Button
        onClick={handleDecline}
        disabled={isPending}
        variant="outline"
        className="w-full"
      >
        Rechazar
      </Button>
    </div>
  );
}
