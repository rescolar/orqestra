import { getEvents } from "@/lib/actions/event";
import { getPersonCount } from "@/lib/actions/directory";
import { DashboardContent } from "@/components/dashboard-content";

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${s.toLocaleDateString("es-ES", sameYear ? opts : yearOpts)} – ${e.toLocaleDateString("es-ES", yearOpts)}`;
}

export default async function DashboardPage() {
  const [events, personCount] = await Promise.all([
    getEvents(),
    getPersonCount(),
  ]);

  const mappedEvents = events.map((event) => ({
    id: event.id,
    name: event.name,
    dateRange: formatDateRange(event.date_start, event.date_end),
    assignedCount: event.assigned_count,
    estimatedParticipants: event.estimated_participants,
    status: event.status,
    imageUrl: event.image_url,
    location: event.location,
    totalCapacity: event.total_capacity,
    pendingCount: event.pending_count,
    isCollaborator: event.is_collaborator,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <DashboardContent events={mappedEvents} personCount={personCount} />
    </div>
  );
}
