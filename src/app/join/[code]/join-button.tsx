"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinEventViaInvite } from "@/lib/actions/invite";

export function JoinButton({ code, eventId }: { code: string; eventId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleJoin = () => {
    startTransition(async () => {
      await joinEventViaInvite(code);
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        ¿Quieres unirte a este evento?
      </p>
      <Button
        onClick={handleJoin}
        disabled={isPending}
        className="w-full bg-primary hover:bg-primary-light"
      >
        {isPending ? "Uniéndote..." : "Unirme"}
      </Button>
    </div>
  );
}
