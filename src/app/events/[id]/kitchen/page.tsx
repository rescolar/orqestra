import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { KitchenService } from "@/lib/services/kitchen.service";
import { KitchenReportClient } from "@/components/kitchen-report";

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

  const rows = await KitchenService.getKitchenReport(id, session.user.id);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <KitchenReportClient
          eventId={event.id}
          eventName={event.name}
          rows={rows}
        />
      </div>
    </div>
  );
}
