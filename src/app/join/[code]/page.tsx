import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveInviteCode } from "@/lib/actions/invite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function JoinLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const organizer = await resolveInviteCode(code);
  if (!organizer) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Orqestra
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Te han invitado a unirte
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Organizador
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {organizer.name}
            </p>
          </div>

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
    </div>
  );
}
