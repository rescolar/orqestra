"use client";

import { useState, useTransition } from "react";
import { getInviteLink } from "@/lib/actions/invite";
import { LinkIcon, Check } from "lucide-react";

export function InviteLinkButton({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const code = await getInviteLink(eventId);
      const url = `${window.location.origin}/join/${code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isPending}
      className="rounded-lg bg-white/90 p-1.5 text-gray-400 shadow-sm hover:bg-white hover:text-primary"
      aria-label="Copiar enlace de invitación"
      title="Copiar enlace de invitación"
    >
      {copied ? (
        <Check className="size-4 text-green-600" />
      ) : (
        <LinkIcon className="size-4" />
      )}
    </button>
  );
}
