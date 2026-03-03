"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export type PendingDietary = {
  id: string;
  person: {
    name_display: string;
    dietary_requirements: string[];
    allergies_text: string | null;
  };
};

export type PendingConflict = {
  id: string;
  display_name: string | null;
  internal_number: string;
  capacity: number;
  gender_restriction: string;
  conflict_acknowledged: boolean;
  assignedCount: number;
  genders: string[];
};

export type PendingTentative = {
  id: string;
  person: { name_display: string };
  room: { display_name: string | null } | null;
};

export type PendingRequest = {
  id: string;
  person: { name_display: string };
  requests_text: string;
};

export type PendingData = {
  dietary: PendingDietary[];
  conflicts: PendingConflict[];
  tentatives: PendingTentative[];
  requests: PendingRequest[];
};

export async function getPendingItems(eventId: string): Promise<PendingData> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Verify event ownership
  const event = await db.event.findFirst({
    where: { id: eventId, user_id: session.user.id },
    select: { id: true },
  });
  if (!event) throw new Error("Evento no encontrado");

  // Dietary/allergies not notified (dietary data lives on Person)
  const dietaryRaw = await db.eventPerson.findMany({
    where: {
      event_id: eventId,
      dietary_notified: false,
      OR: [
        { person: { dietary_requirements: { isEmpty: false } } },
        { person: { allergies_text: { not: null } } },
      ],
    },
    select: {
      id: true,
      person: {
        select: {
          name_display: true,
          dietary_requirements: true,
          allergies_text: true,
        },
      },
    },
    orderBy: { person: { name_display: "asc" } },
  });

  // Room conflicts (capacity overflow or gender violation)
  const roomsRaw = await db.room.findMany({
    where: { event_id: eventId },
    select: {
      id: true,
      display_name: true,
      internal_number: true,
      capacity: true,
      gender_restriction: true,
      conflict_acknowledged: true,
      event_persons: {
        select: {
          person: { select: { gender: true } },
        },
      },
    },
    orderBy: { internal_number: "asc" },
  });

  const conflicts: PendingConflict[] = roomsRaw
    .filter((r) => {
      const count = r.event_persons.length;
      if (count > r.capacity) return true;
      if (r.gender_restriction !== "mixed") {
        const expected = r.gender_restriction === "women" ? "female" : "male";
        if (r.event_persons.some((ep) => ep.person.gender !== expected && ep.person.gender !== "unknown")) return true;
      }
      return false;
    })
    .map((r) => ({
      id: r.id,
      display_name: r.display_name,
      internal_number: r.internal_number,
      capacity: r.capacity,
      gender_restriction: r.gender_restriction,
      conflict_acknowledged: r.conflict_acknowledged,
      assignedCount: r.event_persons.length,
      genders: r.event_persons.map((ep) => ep.person.gender),
    }));

  // Tentative participants
  const tentativesRaw = await db.eventPerson.findMany({
    where: { event_id: eventId, status: "tentative" },
    select: {
      id: true,
      person: { select: { name_display: true } },
      room: { select: { display_name: true } },
    },
    orderBy: { person: { name_display: "asc" } },
  });

  // Unresolved requests
  const requestsRaw = await db.eventPerson.findMany({
    where: {
      event_id: eventId,
      requests_managed: false,
      requests_text: { not: null },
    },
    select: {
      id: true,
      requests_text: true,
      person: { select: { name_display: true } },
    },
    orderBy: { person: { name_display: "asc" } },
  });

  return {
    dietary: dietaryRaw,
    conflicts,
    tentatives: tentativesRaw,
    requests: requestsRaw.map((r) => ({
      ...r,
      requests_text: r.requests_text!,
    })),
  };
}
