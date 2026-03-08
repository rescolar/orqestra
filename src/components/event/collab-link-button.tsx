"use client";

import { useState, useTransition } from "react";
import { getOrCreateCollabCode } from "@/lib/actions/collab";
import { Link2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CollabLinkButton({ eventId }: { eventId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const c = await getOrCreateCollabCode(eventId);
      setCode(c);
      const url = `${window.location.origin}/join-collab/${c}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (code) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join-collab/${code}`;
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-lg border bg-gray-50 px-3 py-1.5 text-sm text-gray-600"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleGenerate}
      disabled={isPending}
    >
      <Link2 className="mr-1.5 size-4" />
      {isPending ? "Generando..." : "Generar enlace co-organizador"}
    </Button>
  );
}
