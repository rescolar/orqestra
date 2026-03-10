import { notFound } from "next/navigation";
import { CentroShareService } from "@/lib/services/centro-share.service";
import { KitchenReportClient } from "@/components/kitchen/kitchen-report";

export default async function CocinaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await CentroShareService.getPublicKitchenReport(token);

  if (!report) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <KitchenReportClient
        eventId=""
        eventName={report.eventName}
        rows={report.rows}
        eventDates={{
          dateStart: report.eventDates.dateStart,
          dateEnd: report.eventDates.dateEnd,
          totalDays: report.eventDates.totalDays,
        }}
        variant="public"
      />
    </div>
  );
}
