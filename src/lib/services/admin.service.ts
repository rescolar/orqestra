import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export const AdminService = {
  async getAllUsers() {
    return db.user.findMany({
      where: {
        role: { in: ["organizer", "admin"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        _count: {
          select: {
            events: true,
            persons: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  },

  async getAllEvents(organizerUserId?: string) {
    return db.event.findMany({
      where: organizerUserId ? { user_id: organizerUserId } : undefined,
      select: {
        id: true,
        name: true,
        date_start: true,
        date_end: true,
        status: true,
        location: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            event_persons: true,
            rooms: true,
          },
        },
      },
      orderBy: { date_start: "desc" },
    });
  },

  async updateUserRole(userId: string, role: UserRole) {
    if (role !== "organizer" && role !== "admin") {
      throw new Error("Rol no válido");
    }
    return db.user.update({
      where: { id: userId },
      data: { role },
    });
  },

  async deleteUser(userId: string) {
    return db.user.delete({
      where: { id: userId },
    });
  },

  async deleteEvent(eventId: string) {
    return db.event.delete({
      where: { id: eventId },
    });
  },

  async getStats() {
    const [userCount, eventCount, personCount] = await Promise.all([
      db.user.count({ where: { role: { in: ["organizer", "admin"] } } }),
      db.event.count(),
      db.person.count(),
    ]);
    return { userCount, eventCount, personCount };
  },
};
