import { notFound } from "next/navigation";
import Link from "next/link";
import { CentroShareService } from "@/lib/services/centro-share.service";
import {
  CalendarDays,
  MapPin,
  Users,
  User,
  ChefHat,
} from "lucide-react";

function formatDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function CentroPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const info = await CentroShareService.getPublicEventInfo(token);

  if (!info) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{info.name}</h1>

      <div className="mt-6 space-y-3 text-gray-600">
        {info.organizerName && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            <span>Organizado por {info.organizerName}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>
            {formatDate(info.dateStart)} — {formatDate(info.dateEnd)}
          </span>
        </div>
        {info.location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{info.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0" />
          <span>{info.confirmedCount} participantes confirmados</span>
        </div>
      </div>

      {info.description && (
        <p className="mt-6 text-gray-600 whitespace-pre-line">
          {info.description}
        </p>
      )}

      <div className="mt-10">
        <Link
          href={`/centro/${token}/cocina`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1E4A4A] px-6 py-3 text-white font-medium hover:bg-[#1E4A4A]/90 transition-colors"
        >
          <ChefHat className="h-5 w-5" />
          Ver informe de cocina
        </Link>
      </div>
    </div>
  );
}
