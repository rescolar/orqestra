"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateEventPreferences } from "@/lib/actions/participant";
import Link from "next/link";

type EventPersonData = {
  id: string;
  status: string;
  arrives_for_dinner: boolean;
  last_meal_lunch: boolean;
  requests_text: string | null;
  event: {
    name: string;
    date_start: Date;
    date_end: Date;
    location: string | null;
  };
  person: {
    dietary_requirements: string[];
    allergies_text: string | null;
  };
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function MyEventDetail({
  eventPerson,
}: {
  eventPerson: EventPersonData;
}) {
  const [status, setStatus] = useState(eventPerson.status);
  const [arrivesForDinner, setArrivesForDinner] = useState(
    eventPerson.arrives_for_dinner
  );
  const [lastMealLunch, setLastMealLunch] = useState(
    eventPerson.last_meal_lunch
  );
  const [requestsText, setRequestsText] = useState(
    eventPerson.requests_text ?? ""
  );
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (data: Parameters<typeof updateEventPreferences>[1]) => {
      setSaving(true);
      await updateEventPreferences(eventPerson.id, data);
      setSaving(false);
    },
    [eventPerson.id]
  );

  const handleStatusChange = async (
    newStatus: "confirmed" | "tentative" | "cancelled"
  ) => {
    setStatus(newStatus);
    await save({ status: newStatus });
  };

  const handleDinnerToggle = async () => {
    const next = !arrivesForDinner;
    setArrivesForDinner(next);
    await save({ arrives_for_dinner: next });
  };

  const handleLunchToggle = async () => {
    const next = !lastMealLunch;
    setLastMealLunch(next);
    await save({ last_meal_lunch: next });
  };

  const handleRequestsBlur = async () => {
    if (requestsText !== (eventPerson.requests_text ?? "")) {
      await save({ requests_text: requestsText || undefined });
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/my-events"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Mis eventos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {eventPerson.event.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(eventPerson.event.date_start)} –{" "}
          {formatDate(eventPerson.event.date_end)}
        </p>
        {eventPerson.event.location && (
          <p className="text-sm text-muted-foreground">
            {eventPerson.event.location}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          Puedes cambiar tus datos en cualquier momento. Los cambios se guardan
          automáticamente.
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asistencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(
              [
                { value: "confirmed", label: "Confirmo" },
                { value: "tentative", label: "Tentativo" },
                { value: "cancelled", label: "No puedo" },
              ] as const
            ).map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={status === value ? "default" : "outline"}
                className={
                  status === value ? "bg-primary hover:bg-primary-light" : ""
                }
                onClick={() => handleStatusChange(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">Cena de llegada</span>
            <button
              type="button"
              role="switch"
              aria-checked={arrivesForDinner}
              onClick={handleDinnerToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                arrivesForDinner ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  arrivesForDinner ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Almuerzo del último día</span>
            <button
              type="button"
              role="switch"
              aria-checked={lastMealLunch}
              onClick={handleLunchToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                lastMealLunch ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  lastMealLunch ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>

          {eventPerson.person.dietary_requirements.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Tu dieta</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {eventPerson.person.dietary_requirements.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {eventPerson.person.allergies_text && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Tus alergias</p>
              <p className="text-sm text-red-700">
                {eventPerson.person.allergies_text}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Puedes editar tu dieta y alergias en{" "}
            <Link href="/my-profile" className="text-primary hover:underline">
              tu perfil
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="requests" className="text-sm text-muted-foreground">
            ¿Algo que quieras comunicar al organizador?
          </Label>
          <textarea
            id="requests"
            className="mt-2 w-full rounded-lg border bg-white p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            placeholder="Ej: Prefiero habitación tranquila, llego tarde el viernes..."
            value={requestsText}
            onChange={(e) => setRequestsText(e.target.value)}
            onBlur={handleRequestsBlur}
          />
        </CardContent>
      </Card>

      {saving && (
        <p className="text-center text-xs text-muted-foreground">
          Guardando...
        </p>
      )}
    </div>
  );
}
