import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UploadService } from "@/lib/services/upload.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const entityId = formData.get("entityId") as string | null;

    if (!file || !type || !entityId) {
      return NextResponse.json(
        { error: "Faltan campos: file, type, entityId" },
        { status: 400 }
      );
    }

    if (type === "avatar") {
      // Verify the person belongs to this user (organizer) or is their self_person (participant)
      const person = await db.person.findFirst({
        where: {
          id: entityId,
          OR: [
            { user_id: session.user.id },
            { self_user_id: session.user.id },
          ],
        },
      });
      if (!person) {
        return NextResponse.json({ error: "Persona no encontrada" }, { status: 404 });
      }

      const url = await UploadService.upload("avatars", entityId, file);
      await db.person.update({
        where: { id: entityId },
        data: { avatar_url: url },
      });

      return NextResponse.json({ url });
    }

    if (type === "logo") {
      // Only the user themselves can upload their logo
      if (entityId !== session.user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }

      const url = await UploadService.upload("logos", entityId, file);
      await db.user.update({
        where: { id: entityId },
        data: { avatar_url: url },
      });

      return NextResponse.json({ url });
    }

    if (type === "event") {
      // Verify the event belongs to this user
      const event = await db.event.findFirst({
        where: { id: entityId, user_id: session.user.id },
      });
      if (!event) {
        return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
      }

      const url = await UploadService.upload("events", entityId, file);
      await db.event.update({
        where: { id: entityId },
        data: { image_url: url },
      });

      return NextResponse.json({ url });
    }

    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
