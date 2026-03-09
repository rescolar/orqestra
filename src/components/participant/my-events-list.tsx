"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { joinEvent } from "@/lib/actions/participant";
import { useRouter } from "next/navigation";
import { useState } from "react";

type EventItem = {
  id: string;
  name: string;
  date_start: Date;
  date_end: Date;
  location: string | null;
  description: string | null;
  image_url: string | null;
  organizerName?: string;
  isJoined: boolean;
  eventPersonId: string | null;
  status: string | null;
};

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${s.toLocaleDateString("es-ES", sameYear ? opts : yearOpts)} – ${e.toLocaleDateString("es-ES", yearOpts)}`;
}

export function MyEventsList({ events }: { events: EventItem[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <p className="text-muted-foreground">
          No hay eventos disponibles todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

const STATUS_BADGE_MAP: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  inscrito: { bg: "bg-blue-100", text: "text-blue-800", icon: "how_to_reg", label: "Inscrito" },
  reservado: { bg: "bg-amber-100", text: "text-amber-800", icon: "payments", label: "Reservado" },
  pagado: { bg: "bg-green-100", text: "text-green-800", icon: "check_circle", label: "Pagado" },
  confirmado_sin_pago: { bg: "bg-green-100", text: "text-green-800", icon: "verified", label: "Confirmado" },
  solicita_cancelacion: { bg: "bg-amber-100", text: "text-amber-800", icon: "pending", label: "Cancelación solicitada" },
  cancelado: { bg: "bg-red-100", text: "text-red-800", icon: "cancel", label: "Cancelado" },
};

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_BADGE_MAP[status ?? ""] ?? STATUS_BADGE_MAP.inscrito;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function EventCard({ event }: { event: EventItem }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    await joinEvent(event.id);
    router.push(`/my-events/${event.id}`);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900">{event.name}</h3>
            {event.organizerName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                por {event.organizerName}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateRange(event.date_start, event.date_end)}
            </p>
            {event.location && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {event.location}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            {event.isJoined ? (
              <Link href={`/my-events/${event.id}`}>
                <StatusBadge status={event.status} />
              </Link>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary-light"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? "Uniéndome..." : "Unirme"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
