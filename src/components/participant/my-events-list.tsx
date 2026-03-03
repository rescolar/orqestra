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
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                  Inscrito
                </span>
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
