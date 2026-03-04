import { notFound } from "next/navigation";
import { CentroShareService } from "@/lib/services/centro-share.service";
import { KitchenReportClient } from "@/components/kitchen-report";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default async function CentroPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await CentroShareService.getPublicKitchenReport(token);

  if (!report) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <KitchenReportClient
          eventId=""
          eventName={report.eventName}
          rows={report.rows}
          variant="public"
        />
      </div>
    </div>
  );
}
