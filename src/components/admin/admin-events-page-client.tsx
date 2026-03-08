"use client";

import { useState, useTransition, useEffect } from "react";
import { getAllEvents as fetchAllEvents } from "@/lib/actions/admin";
import { EventsTable } from "./events-table";

type Organizer = { id: string; name: string; email: string };

type Event = {
  id: string;
  name: string;
  date_start: Date;
  date_end: Date;
  status: string;
  location: string | null;
  user: { name: string; email: string };
  _count: { event_persons: number; rooms: number };
};

export function AdminEventsPageClient({
  initialEvents,
  organizers,
}: {
  initialEvents: Event[];
  organizers: Organizer[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOrgChange(orgId: string) {
    setSelectedOrg(orgId);
    startTransition(async () => {
      const filtered = await fetchAllEvents(orgId || undefined);
      setEvents(filtered);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Organizador:</label>
        <select
          value={selectedOrg}
          onChange={(e) => handleOrgChange(e.target.value)}
          disabled={isPending}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {organizers.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name} ({org.email})
            </option>
          ))}
        </select>
        {isPending && <span className="text-xs text-gray-400">Cargando...</span>}
      </div>
      <EventsTable events={events} />
    </div>
  );
}
