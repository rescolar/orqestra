"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getInviteLink } from "@/lib/actions/invite";
import { LinkIcon, Check } from "lucide-react";

export function InviteLinkButton() {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopy = () => {
    startTransition(async () => {
      const code = await getInviteLink();
      const url = `${window.location.origin}/join/${code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={isPending}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="size-4 text-green-600" />
          <span className="text-green-600">¡Copiado!</span>
        </>
      ) : (
        <>
          <LinkIcon className="size-4" />
          {isPending ? "Generando..." : "Copiar enlace de invitación"}
        </>
      )}
    </Button>
  );
}
