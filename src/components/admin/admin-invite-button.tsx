"use client";

import { useState, useTransition } from "react";
import { createAdminInviteToken } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Check, Copy, UserPlus } from "lucide-react";

export function AdminInviteButton() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const t = await createAdminInviteToken();
      setToken(t);
      const url = `${window.location.origin}/join-admin/${t}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (token) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join-admin/${token}`;
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
      onClick={handleCreate}
      disabled={isPending}
      className="bg-primary hover:bg-primary/90"
    >
      <UserPlus className="mr-1.5 size-4" />
      {isPending ? "Generando..." : "Invitar admin"}
    </Button>
  );
}
