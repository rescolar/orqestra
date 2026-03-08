"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { consumeAdminToken } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function JoinAdminClient({ token }: { token: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    startTransition(async () => {
      try {
        await consumeAdminToken(token);
        await update(); // Refresh session to pick up new role
        router.push("/admin");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aceptar");
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
        {isPending ? "Procesando..." : "Aceptar invitación"}
      </Button>
    </div>
  );
}
