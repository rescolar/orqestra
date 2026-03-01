"use client";

import { useRef, useState } from "react";
import { createEvent } from "@/lib/actions/event";
import { WizardStepper } from "@/components/wizard-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const STEPS = [
  { label: "Datos" },
  { label: "Habitaciones" },
  { label: "Detalles" },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function NewEventPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endDateRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      await createEvent(formData);
    } catch (e) {
      if (e instanceof Error && "digest" in e) throw e;
      setError(e instanceof Error ? e.message : "Error al crear el evento");
      setPending(false);
    }
  }

  function handleStartDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const startVal = e.target.value;
    if (startVal && endDateRef.current) {
      const endInput = endDateRef.current;
      if (!endInput.value || endInput.value <= startVal) {
        endInput.value = addDays(startVal, 1);
      }
      endInput.min = addDays(startVal, 1);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <WizardStepper steps={STEPS} currentStep={0} />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Evento</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingresa los datos básicos de tu evento
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del evento</Label>
              <Input
                id="name"
                name="name"
                placeholder="Retiro Primavera 2026"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_start">Fecha inicio</Label>
                <Input
                  id="date_start"
                  name="date_start"
                  type="date"
                  required
                  onChange={handleStartDateChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_end">Fecha fin</Label>
                <Input
                  id="date_end"
                  name="date_end"
                  type="date"
                  required
                  ref={endDateRef}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_participants">
                Participantes estimados
              </Label>
              <Input
                id="estimated_participants"
                name="estimated_participants"
                type="number"
                min={1}
                placeholder="30"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="size-4" />
                Cancelar
              </Link>
              <Button type="submit" disabled={pending}>
                {pending ? "Creando..." : "Siguiente"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
