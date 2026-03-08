import { db } from "@/lib/db";
import type { AuthContext } from "./auth-context";
import { canAccessEvent } from "./auth-context";

export const GroupService = {
  async createGroup(
    eventId: string,
    ctx: AuthContext,
    memberIds: string[]
  ) {
    if (!(await canAccessEvent(ctx, eventId))) throw new Error("Evento no encontrado");

    const group = await db.group.create({
      data: {
        event_id: eventId,
        name: `rel-${Date.now()}`,
      },
    });

    if (memberIds.length > 0) {
      await db.eventPerson.updateMany({
        where: {
          id: { in: memberIds },
          event_id: eventId,
        },
        data: { group_id: group.id },
      });
    }

    return group;
  },

  async addMemberToGroup(groupId: string, eventPersonId: string, ctx: AuthContext) {
    const group = await db.group.findFirst({
      where: { id: groupId },
      select: { id: true, event_id: true },
    });
    if (!group) throw new Error("Grupo no encontrado");
    if (!(await canAccessEvent(ctx, group.event_id))) throw new Error("Grupo no encontrado");

    return db.eventPerson.update({
      where: { id: eventPersonId },
      data: { group_id: groupId },
    });
  },

  async removeMemberFromGroup(eventPersonId: string, ctx: AuthContext) {
    const ep = await db.eventPerson.findFirst({
      where: { id: eventPersonId },
      select: { id: true, group_id: true, inseparable_with_id: true, event_id: true },
    });
    if (!ep || !(await canAccessEvent(ctx, ep.event_id))) throw new Error("No encontrado");
    if (!ep.group_id) return;

    const groupId = ep.group_id;

    // Clear any inseparable link involving this person
    if (ep.inseparable_with_id) {
      await db.eventPerson.update({
        where: { id: ep.inseparable_with_id },
        data: { inseparable_with_id: null },
      });
    }

    // Remove this person from the group
    await db.eventPerson.update({
      where: { id: eventPersonId },
      data: { group_id: null, inseparable_with_id: null },
    });

    // Count remaining members
    const remaining = await db.eventPerson.count({
      where: { group_id: groupId },
    });

    // If 1 or fewer members remain, dissolve the group
    if (remaining <= 1) {
      // Clear inseparable links for remaining member
      await db.eventPerson.updateMany({
        where: { group_id: groupId },
        data: { group_id: null, inseparable_with_id: null },
      });
      await db.group.delete({ where: { id: groupId } });
    }
  },

  async toggleInseparable(eventPersonId: string, partnerId: string, ctx: AuthContext) {
    const [ep, partner] = await Promise.all([
      db.eventPerson.findFirst({
        where: { id: eventPersonId },
        select: { id: true, inseparable_with_id: true, room_id: true, event_id: true },
      }),
      db.eventPerson.findFirst({
        where: { id: partnerId },
        select: { id: true, inseparable_with_id: true, room_id: true },
      }),
    ]);
    if (!ep || !(await canAccessEvent(ctx, ep.event_id))) throw new Error("No encontrado");
    if (!partner) throw new Error("Persona no encontrada");

    const isCurrentlyLinked = ep.inseparable_with_id === partnerId;

    if (isCurrentlyLinked) {
      // Unlink both — don't move rooms
      await db.eventPerson.updateMany({
        where: { id: { in: [eventPersonId, partnerId] } },
        data: { inseparable_with_id: null },
      });
    } else {
      // Clear any existing inseparable links for both persons
      const toClear: string[] = [];
      if (ep.inseparable_with_id) toClear.push(ep.inseparable_with_id);
      if (partner.inseparable_with_id) toClear.push(partner.inseparable_with_id);

      if (toClear.length > 0) {
        await db.eventPerson.updateMany({
          where: { id: { in: toClear } },
          data: { inseparable_with_id: null },
        });
      }

      // Link them
      await db.eventPerson.update({
        where: { id: eventPersonId },
        data: { inseparable_with_id: partnerId },
      });
      await db.eventPerson.update({
        where: { id: partnerId },
        data: { inseparable_with_id: eventPersonId },
      });

      // Auto-move: partner joins the person's room (or vice versa)
      if (ep.room_id && ep.room_id !== partner.room_id) {
        await db.eventPerson.update({
          where: { id: partnerId },
          data: { room_id: ep.room_id },
        });
      } else if (partner.room_id && partner.room_id !== ep.room_id) {
        await db.eventPerson.update({
          where: { id: eventPersonId },
          data: { room_id: partner.room_id },
        });
      }
    }
  },
};
