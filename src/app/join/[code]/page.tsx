import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveInviteCode } from "@/lib/actions/invite";
import { auth } from "@/lib/auth";
import { InviteService } from "@/lib/services/invite.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin } from "lucide-react";
import { JoinButton } from "./join-button";

function formatDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function JoinLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const resolved = await resolveInviteCode(code);
  if (!resolved) notFound();

  const { event, organizer } = resolved;

  // Check if user is logged in as participant
  const session = await auth();
  if (session?.user?.id && session.user.role === "participant") {
    const isJoined = await InviteService.isParticipantJoined(
      session.user.id,
      event.id
    );
    if (isJoined) {
      redirect(`/my-events/${event.id}`);
    }

    // Logged in but not joined — show confirmation
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <BrandHeader organizer={organizer} />
        </CardHeader>
        <CardContent className="space-y-6">
          <EventInfo event={event} organizer={organizer} />
          <JoinButton code={code} eventId={event.id} />
        </CardContent>
      </Card>
    );
  }

  // Not logged in — show register/login buttons
  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader>
        <BrandHeader organizer={organizer} />
        <p className="mt-2 text-sm text-muted-foreground">
          {organizer.brand_welcome_msg || "Te han invitado a unirte"}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <EventInfo event={event} organizer={organizer} />

        <div className="space-y-3">
          <Button asChild className="w-full bg-primary hover:bg-primary-light">
            <Link href={`/join/${code}/register`}>Registrarme</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/join/${code}/login`}>Ya tengo cuenta</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type OrganizerBranding = {
  name: string;
  avatar_url: string | null;
  brand_name: string | null;
  brand_text_color: string | null;
};

function BrandHeader({ organizer }: { organizer: OrganizerBranding }) {
  return (
    <>
      {organizer.avatar_url && (
        <div className="mx-auto mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={organizer.avatar_url}
            alt={organizer.brand_name || organizer.name}
            className="mx-auto h-12 w-auto object-contain"
          />
        </div>
      )}
      <CardTitle
        className="text-2xl font-bold"
        style={{ color: organizer.brand_text_color || undefined }}
      >
        {organizer.brand_name || "Ordenaia"}
      </CardTitle>
    </>
  );
}

function EventInfo({
  event,
  organizer,
}: {
  event: { name: string; date_start: Date; date_end: Date; location: string | null };
  organizer: OrganizerBranding;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-lg font-semibold text-gray-900">{event.name}</p>
        <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formatDate(event.date_start)} – {formatDate(event.date_end)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {event.location}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Organiza: {organizer.brand_name || organizer.name}
        </p>
      </div>
    </div>
  );
}
