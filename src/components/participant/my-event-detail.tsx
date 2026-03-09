"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateEventPreferences } from "@/lib/actions/participant";
import { ParticipantSchedule } from "./participant-schedule";
import { RelationshipInviteForm } from "./relationship-invite-form";
import { ParticipantDiscovery } from "./participant-discovery";
import Link from "next/link";
import type { ParticipantDaySchedule } from "@/lib/services/schedule.service";

type EventPersonData = {
  id: string;
  status: string;
  arrives_for_dinner: boolean;
  last_meal_lunch: boolean;
  requests_text: string | null;
  event: {
    id: string;
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

type DiscoverableParticipant = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  status: string;
};

export function MyEventDetail({
  eventPerson,
  schedule,
  scheduleConfirmed = false,
  discoverableParticipants = [],
}: {
  eventPerson: EventPersonData;
  schedule?: ParticipantDaySchedule[];
  scheduleConfirmed?: boolean;
  discoverableParticipants?: DiscoverableParticipant[];
}) {
  const [activeTab, setActiveTab] = useState<"data" | "schedule">("data");
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

  const handleRequestCancel = async () => {
    setStatus("solicita_cancelacion");
    await save({ status: "solicita_cancelacion" });
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

      {schedule && schedule.length > 0 && (
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("data")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "data"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mis datos
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "schedule"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="material-symbols-outlined mr-1 align-middle text-base">
              calendar_month
            </span>
            Programa
          </button>
        </div>
      )}

      {activeTab === "schedule" && schedule && schedule.length > 0 ? (
        <ParticipantSchedule
          eventId={eventPerson.event.id}
          schedule={schedule}
          scheduleConfirmed={scheduleConfirmed}
        />
      ) : (
      <>
      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {status === "inscrito" && (
              <span className="text-blue-600">
                <span className="material-symbols-outlined align-middle text-base">how_to_reg</span>{" "}
                Inscrito
              </span>
            )}
            {status === "reservado" && (
              <span className="text-amber-600">
                <span className="material-symbols-outlined align-middle text-base">payments</span>{" "}
                Reservado (depósito pagado)
              </span>
            )}
            {status === "pagado" && (
              <span className="text-green-700">
                <span className="material-symbols-outlined align-middle text-base">check_circle</span>{" "}
                Pagado
              </span>
            )}
            {status === "confirmado_sin_pago" && (
              <span className="text-green-700">
                <span className="material-symbols-outlined align-middle text-base">verified</span>{" "}
                Confirmado
              </span>
            )}
            {status === "solicita_cancelacion" && (
              <span className="text-amber-600">
                <span className="material-symbols-outlined align-middle text-base">pending</span>{" "}
                Cancelación solicitada
              </span>
            )}
            {status === "cancelado" && (
              <span className="text-red-600">
                <span className="material-symbols-outlined align-middle text-base">cancel</span>{" "}
                Cancelado
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status !== "cancelado" && status !== "solicita_cancelacion" && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleRequestCancel}
            >
              Cancelar inscripción
            </Button>
          )}
          {status === "solicita_cancelacion" && (
            <p className="text-sm text-amber-600">
              Tu solicitud de cancelación está pendiente de revisión por el organizador.
            </p>
          )}
          {status === "cancelado" && (
            <p className="text-sm text-gray-500">
              Tu inscripción ha sido cancelada.
            </p>
          )}
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

      {/* Relationship invite */}
      <RelationshipInviteForm eventId={eventPerson.event.id} />

      {/* Participant discovery */}
      {discoverableParticipants.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <ParticipantDiscovery participants={discoverableParticipants} />
          </CardContent>
        </Card>
      )}

      {saving && (
        <p className="text-center text-xs text-muted-foreground">
          Guardando...
        </p>
      )}
      </>
      )}
    </div>
  );
}
