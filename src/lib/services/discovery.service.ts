import { db } from "@/lib/db";

export const DiscoveryService = {
  async getDiscoverableParticipants(eventId: string, requestingUserId: string) {
    // Triple gate: event.participant_discovery + person.discoverable
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { participant_discovery: true, user_id: true },
    });
    if (!event || !event.participant_discovery) return [];

    // Get the requesting user's person in this org to exclude from results
    const selfPerson = await db.person.findFirst({
      where: { self_user_id: requestingUserId, user_id: event.user_id },
      select: { id: true },
    });

    const eventPersons = await db.eventPerson.findMany({
      where: {
        event_id: eventId,
        status: { in: ["confirmed", "tentative"] },
        person: {
          discoverable: true,
          ...(selfPerson ? { id: { not: selfPerson.id } } : {}),
        },
      },
      select: {
        id: true,
        status: true,
        person: {
          select: {
            name_display: true,
            name_initials: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { person: { name_full: "asc" } },
    });

    return eventPersons.map((ep) => ({
      id: ep.id,
      name: ep.person.name_display,
      initials: ep.person.name_initials,
      avatarUrl: ep.person.avatar_url,
      status: ep.status,
    }));
  },
};
