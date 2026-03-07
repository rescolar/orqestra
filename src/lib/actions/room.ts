"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RoomService } from "@/lib/services/room.service";
import { GenderRestriction } from "@prisma/client";
import type { AuthContext } from "@/lib/services/auth-context";

async function requireAuth(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, role: session.user.role };
}

export async function createRoom(eventId: string, formData: FormData) {
  const ctx = await requireAuth();

  const displayName = formData.get("display_name") as string;
  const capacity = Number(formData.get("capacity")) || 2;
  const hasPrivateBathroom = formData.get("has_private_bathroom") === "on";
  const genderRestriction =
    (formData.get("gender_restriction") as GenderRestriction) || "mixed";

  await RoomService.createRoom(eventId, ctx, {
    display_name: displayName || undefined,
    capacity,
    has_private_bathroom: hasPrivateBathroom,
    gender_restriction: genderRestriction,
  });

  revalidatePath(`/events/${eventId}/board`);
}

export async function updateRoom(roomId: string, formData: FormData) {
  const ctx = await requireAuth();

  const displayName = formData.get("display_name") as string;
  const capacity = Number(formData.get("capacity"));
  const hasPrivateBathroom = formData.get("has_private_bathroom") === "on";
  const genderRestriction = formData.get(
    "gender_restriction"
  ) as GenderRestriction;

  const room = await RoomService.updateRoom(roomId, ctx, {
    ...(displayName !== null && { display_name: displayName }),
    ...(capacity && { capacity }),
    has_private_bathroom: hasPrivateBathroom,
    ...(genderRestriction && { gender_restriction: genderRestriction }),
  });

  revalidatePath(`/events/${room.event_id}/board`);
}

export async function getRoomDetail(roomId: string) {
  const ctx = await requireAuth();
  return RoomService.getRoomDetail(roomId, ctx);
}

export async function updateRoomField(
  roomId: string,
  eventId: string,
  data: Record<string, unknown>
) {
  const ctx = await requireAuth();
  await RoomService.updateRoom(
    roomId,
    ctx,
    data as Parameters<typeof RoomService.updateRoom>[2]
  );
  revalidatePath(`/events/${eventId}/board`);
}

export async function deleteRoom(roomId: string, eventId: string) {
  const ctx = await requireAuth();
  await RoomService.deleteRoom(roomId, ctx);
  revalidatePath(`/events/${eventId}/board`);
}
