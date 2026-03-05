"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, ArrowRight } from "lucide-react";
import { EventCard } from "@/components/event/event-card";

type EventData = {
  id: string;
  name: string;
  dateRange: string;
  assignedCount: number;
  estimatedParticipants: number;
  status: string;
  imageUrl: string | null;
  location: string | null;
  totalCapacity: number;
  pendingCount: number;
};

interface DashboardContentProps {
  events: EventData[];
  personCount: number;
}

export function DashboardContent({ events, personCount }: DashboardContentProps) {
  const [showArchived, setShowArchived] = useState(false);

  const activeEvents = events.filter((e) => e.status === "active" || e.status === "draft");
  const archivedEvents = events.filter((e) => e.status === "archived");

  return (
    <div className="space-y-10">
      {/* Active events */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Eventos Activos</h1>
          {archivedEvents.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showArchived ? "Ocultar archivados" : `Ver archivados (${archivedEvents.length})`}
            </button>
          )}
        </div>

        {activeEvents.length === 0 && !showArchived ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <NewEventCard />
            <div className="col-span-full -mt-2">
              <p className="text-sm text-gray-500">
                Aún no tienes eventos. Crea uno para empezar a organizar tu retiro.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
            <NewEventCard />
          </div>
        )}
      </section>

      {/* Archived events */}
      {showArchived && archivedEvents.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-600">Archivados</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {archivedEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>
      )}

      {/* Mis Personas */}
      <section>
        <div className="rounded-2xl bg-primary p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Registrados
              </p>
              <p className="mt-1 text-4xl font-bold">{personCount}</p>
              <p className="mt-1 text-sm text-white/80">
                {personCount === 1 ? "Persona activa" : "Personas activas"}
              </p>
            </div>
            <div className="flex items-center">
              <Users className="size-12 text-white/30" />
            </div>
          </div>
          <Link
            href="/persons"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30"
          >
            Ver directorio
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function NewEventCard() {
  return (
    <Link
      href="/events/new"
      className="flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-gray-500 transition-colors hover:border-primary hover:text-primary"
    >
      <Plus className="size-6" />
      <span className="text-sm font-medium">Nuevo Evento</span>
    </Link>
  );
}
