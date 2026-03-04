"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  getOrCreateCentroToken,
  revokeCentroToken,
  regenerateCentroToken,
  getCentroTokenInfo,
} from "@/lib/actions/centro-share";
import { LinkIcon, Check, Copy, RefreshCw, X } from "lucide-react";

interface KitchenShareButtonProps {
  eventId: string;
}

export function KitchenShareButton({ eventId }: KitchenShareButtonProps) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCentroTokenInfo(eventId).then((info) => {
      if (info) {
        setToken(info.token);
        setExpiresAt(new Date(info.expires_at));
      }
      setLoaded(true);
    });
  }, [eventId]);

  function handleCreate() {
    startTransition(async () => {
      const result = await getOrCreateCentroToken(eventId);
      setToken(result.token);
      setExpiresAt(new Date(result.expires_at));
    });
  }

  function handleCopy() {
    if (!token) return;
    const url = `${window.location.origin}/centro/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRegenerate() {
    if (!confirm("¿Regenerar el enlace? El enlace anterior dejará de funcionar.")) return;
    startTransition(async () => {
      const result = await regenerateCentroToken(eventId);
      setToken(result.token);
      setExpiresAt(new Date(result.expires_at));
    });
  }

  function handleRevoke() {
    if (!confirm("¿Revocar el enlace? La cocina ya no podrá acceder al informe.")) return;
    startTransition(async () => {
      await revokeCentroToken(eventId);
      setToken(null);
      setExpiresAt(null);
    });
  }

  if (!loaded) return null;

  if (!token) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreate}
        disabled={isPending}
        className="gap-2"
      >
        <LinkIcon className="size-4" />
        {isPending ? "Generando..." : "Compartir con cocina"}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-2"
      >
        {copied ? (
          <>
            <Check className="size-4 text-green-600" />
            <span className="text-green-600">¡Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="size-4" />
            Copiar enlace cocina
          </>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRegenerate}
        disabled={isPending}
        title="Regenerar enlace"
      >
        <RefreshCw className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRevoke}
        disabled={isPending}
        title="Revocar enlace"
        className="text-red-600 hover:text-red-700"
      >
        <X className="size-4" />
      </Button>
      {expiresAt && (
        <span className="text-xs text-gray-400">
          Expira: {expiresAt.toLocaleDateString("es-ES")}
        </span>
      )}
    </div>
  );
}
