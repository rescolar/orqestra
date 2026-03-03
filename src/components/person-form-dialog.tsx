"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Gender } from "@prisma/client";

type PersonFormData = {
  name_full: string;
  gender: Gender;
  default_role: "participant" | "facilitator";
  contact_email: string;
  contact_phone: string;
};

interface PersonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PersonFormData) => Promise<void>;
  title: string;
  initial?: Partial<PersonFormData>;
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Mujer" },
  { value: "male", label: "Hombre" },
  { value: "other", label: "Otro" },
  { value: "unknown", label: "Sin especificar" },
];

export function PersonFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  initial,
}: PersonFormDialogProps) {
  const [name, setName] = useState(initial?.name_full ?? "");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "unknown");
  const [role, setRole] = useState<"participant" | "facilitator">(
    initial?.default_role ?? "participant"
  );
  const [email, setEmail] = useState(initial?.contact_email ?? "");
  const [phone, setPhone] = useState(initial?.contact_phone ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await onSubmit({
        name_full: name.trim(),
        gender,
        default_role: role,
        contact_email: email.trim(),
        contact_phone: phone.trim(),
      });
      if (!initial) {
        setName("");
        setGender("unknown");
        setRole("participant");
        setEmail("");
        setPhone("");
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pf-name">Nombre completo *</Label>
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellido"
              required
            />
          </div>

          <div>
            <Label>Género</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(g.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    gender === g.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Rol por defecto</Label>
            <div className="mt-1.5 flex gap-2">
              {(["participant", "facilitator"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    role === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {r === "participant" ? "Participante" : "Facilitador"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pf-email">Email</Label>
              <Input
                id="pf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@ejemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="pf-phone">Teléfono</Label>
              <Input
                id="pf-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
