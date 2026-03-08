"use client";

import { useState, useTransition } from "react";
import { createRelationshipInvite } from "@/lib/actions/relationship-invite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy, UserPlus } from "lucide-react";

export function RelationshipInviteForm({ eventId }: { eventId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"inseparable" | "flexible">("flexible");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit() {
    if (!email.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const invite = await createRelationshipInvite(eventId, email.trim(), type);
        const url = `${window.location.origin}/rel/${invite.token}`;
        setInviteLink(url);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear invitación");
      }
    });
  }

  if (inviteLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invitación creada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Comparte este enlace con {email}:
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 rounded-lg border bg-gray-50 px-3 py-1.5 text-sm text-gray-600"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setInviteLink(null);
              setEmail("");
              setShowForm(false);
            }}
          >
            Crear otra invitación
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!showForm) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowForm(true)}
      >
        <UserPlus className="mr-1.5 size-4" />
        Invitar compañero/a
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invitar compañero/a</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rel-email">Email del compañero/a</Label>
          <Input
            id="rel-email"
            type="email"
            placeholder="compañero@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de relación</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={type === "flexible" ? "default" : "outline"}
              className={type === "flexible" ? "bg-primary" : ""}
              onClick={() => setType("flexible")}
            >
              Preferida
            </Button>
            <Button
              size="sm"
              variant={type === "inseparable" ? "default" : "outline"}
              className={type === "inseparable" ? "bg-primary" : ""}
              onClick={() => setType("inseparable")}
            >
              Inseparable
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {type === "inseparable"
              ? "Serán asignados siempre a la misma habitación."
              : "Se intentará asignarlos juntos, pero no es obligatorio."}
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isPending || !email.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {isPending ? "Creando..." : "Crear invitación"}
          </Button>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
