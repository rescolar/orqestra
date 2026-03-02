"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RoomService } from "@/lib/services/room.service";
import { GenderRestriction } from "@prisma/client";

export async function createRoom(eventId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const displayName = formData.get("display_name") as string;
  const capacity = Number(formData.get("capacity")) || 2;
  const hasPrivateBathroom = formData.get("has_private_bathroom") === "on";
  const genderRestriction =
    (formData.get("gender_restriction") as GenderRestriction) || "mixed";

  await RoomService.createRoom(eventId, session.user.id, {
    display_name: displayName || undefined,
    capacity,
    has_private_bathroom: hasPrivateBathroom,
    gender_restriction: genderRestriction,
  });

  revalidatePath(`/events/${eventId}/board`);
}

export async function updateRoom(roomId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const displayName = formData.get("display_name") as string;
  const capacity = Number(formData.get("capacity"));
  const hasPrivateBathroom = formData.get("has_private_bathroom") === "on";
  const genderRestriction = formData.get(
    "gender_restriction"
  ) as GenderRestriction;

  const room = await RoomService.updateRoom(roomId, session.user.id, {
    ...(displayName !== null && { display_name: displayName }),
    ...(capacity && { capacity }),
    has_private_bathroom: hasPrivateBathroom,
    ...(genderRestriction && { gender_restriction: genderRestriction }),
  });

  revalidatePath(`/events/${room.event_id}/board`);
}

export async function getRoomDetail(roomId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return RoomService.getRoomDetail(roomId, session.user.id);
}

export async function updateRoomField(
  roomId: string,
  eventId: string,
  data: Record<string, unknown>
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await RoomService.updateRoom(
    roomId,
    session.user.id,
    data as Parameters<typeof RoomService.updateRoom>[2]
  );
  revalidatePath(`/events/${eventId}/board`);
}

export async function deleteRoom(roomId: string, eventId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await RoomService.deleteRoom(roomId, session.user.id);
  revalidatePath(`/events/${eventId}/board`);
}
