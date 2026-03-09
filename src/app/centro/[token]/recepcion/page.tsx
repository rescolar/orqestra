import { notFound } from "next/navigation";
import { CentroShareService } from "@/lib/services/centro-share.service";
import { ReceptionClient } from "@/components/reception/reception-client";

export default async function CentroRecepcionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await CentroShareService.getPublicReceptionReport(token);

  if (!report) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <ReceptionClient
        eventId=""
        eventName={report.eventName}
        dateStart={report.dateStart}
        dateEnd={report.dateEnd}
        initialParticipants={report.participants}
        pricing={report.pricing}
        variant="public"
      />
    </div>
  );
}
