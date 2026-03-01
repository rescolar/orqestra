import { db } from "@/lib/db";
import { GroupType } from "@prisma/client";

export const GroupService = {
  async getGroupsForEvent(eventId: string, userId: string) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    return db.group.findMany({
      where: { event_id: eventId },
      include: {
        members: {
          select: {
            id: true,
            person: {
              select: {
                name_display: true,
                name_initials: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  async createGroup(
    eventId: string,
    userId: string,
    data: { name: string; type: GroupType; memberIds: string[] }
  ) {
    const event = await db.event.findFirst({
      where: { id: eventId, user_id: userId },
      select: { id: true },
    });
    if (!event) throw new Error("Evento no encontrado");

    const group = await db.group.create({
      data: {
        event_id: eventId,
        name: data.name,
        type: data.type,
      },
    });

    if (data.memberIds.length > 0) {
      await db.eventPerson.updateMany({
        where: {
          id: { in: data.memberIds },
          event_id: eventId,
        },
        data: { group_id: group.id },
      });
    }

    return group;
  },

  async addMemberToGroup(groupId: string, eventPersonId: string, userId: string) {
    const group = await db.group.findFirst({
      where: { id: groupId, event: { user_id: userId } },
      select: { id: true, event_id: true },
    });
    if (!group) throw new Error("Grupo no encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data: { group_id: groupId },
    });
  },

  async removeMemberFromGroup(eventPersonId: string, userId: string) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      include: { event: { select: { user_id: true } } },
    });
    if (!ep || ep.event.user_id !== userId) throw new Error("No encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data: { group_id: null },
    });
  },

  async deleteGroup(groupId: string, userId: string) {
    const group = await db.group.findFirst({
      where: { id: groupId, event: { user_id: userId } },
      select: { id: true },
    });
    if (!group) throw new Error("Grupo no encontrado");

    // Unset group_id on all members first
    await db.eventPerson.updateMany({
      where: { group_id: groupId },
      data: { group_id: null },
    });

    return db.group.delete({ where: { id: groupId } });
  },

  async updateGroupType(groupId: string, userId: string, type: GroupType) {
    const group = await db.group.findFirst({
      where: { id: groupId, event: { user_id: userId } },
      select: { id: true },
    });
    if (!group) throw new Error("Grupo no encontrado");

    return db.group.update({
      where: { id: groupId },
      data: { type },
    });
  },
};
