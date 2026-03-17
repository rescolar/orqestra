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
  isCollaborator: boolean;
};

interface DashboardContentProps {
  events: EventData[];
  personCount: number;
}

type FilterTab = "active" | "finished" | "archived";

export function DashboardContent({ events, personCount }: DashboardContentProps) {
  const [tab, setTab] = useState<FilterTab>("active");

  const activeEvents = events.filter((e) => e.status === "draft" || e.status === "published" || e.status === "active");
  const finishedEvents = events.filter((e) => e.status === "finished");
  const archivedEvents = events.filter((e) => e.status === "archived");

  const filteredEvents =
    tab === "active" ? activeEvents :
    tab === "finished" ? finishedEvents :
    archivedEvents;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "active", label: "Activos", count: activeEvents.length },
    { key: "finished", label: "Finalizados", count: finishedEvents.length },
    { key: "archived", label: "Archivados", count: archivedEvents.length },
  ];

  return (
    <div className="space-y-10">
      {/* Filter chips */}
      <section>
        <div className="mb-6 flex items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tab === "active" && <NewEventCard />}
            <div className="col-span-full -mt-2">
              <p className="text-sm text-gray-500">
                {tab === "active"
                  ? "Aún no tienes eventos. Crea uno para empezar a organizar tu retiro."
                  : tab === "finished"
                    ? "No hay eventos finalizados."
                    : "No hay eventos archivados."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
            {tab === "active" && <NewEventCard />}
          </div>
        )}
      </section>

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
