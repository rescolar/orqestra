import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { KitchenService } from "@/lib/services/kitchen.service";
import { KitchenReportClient } from "@/components/kitchen/kitchen-report";
import { db } from "@/lib/db";

export default async function KitchenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const event = await db.event.findFirst({
    where: { id, user_id: session.user.id },
    select: { id: true, name: true },
  });
  if (!event) notFound();

  const { rows, eventDates } = await KitchenService.getKitchenReport(id, {
    userId: session.user.id,
    role: session.user.role,
  });

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <KitchenReportClient
          eventId={event.id}
          eventName={event.name}
          rows={rows}
          eventDates={{
            dateStart: eventDates.dateStart,
            dateEnd: eventDates.dateEnd,
            totalDays: eventDates.totalDays,
          }}
        />
      </div>
    </div>
  );
}
