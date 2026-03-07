"use client";

import { useState, useTransition } from "react";
import { updateUserRole, deleteUser } from "@/lib/actions/admin";
import type { UserRole } from "@prisma/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: Date;
  _count: { events: number; persons: number };
};

export function UsersTable({ users }: { users: User[] }) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium text-right">Eventos</th>
            <th className="px-4 py-3 font-medium text-right">Personas</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleRoleChange(newRole: UserRole) {
    startTransition(async () => {
      try {
        await updateUserRole(user.id, newRole);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteUser(user.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error");
      }
      setShowDeleteConfirm(false);
    });
  }

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
      <td className="px-4 py-3 text-gray-600">{user.email}</td>
      <td className="px-4 py-3">
        <select
          value={user.role}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          disabled={isPending}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="organizer">Organizador</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td className="px-4 py-3 text-right text-gray-600">{user._count.events}</td>
      <td className="px-4 py-3 text-right text-gray-600">{user._count.persons}</td>
      <td className="px-4 py-3 text-gray-600">
        {new Date(user.created_at).toLocaleDateString("es-ES")}
      </td>
      <td className="px-4 py-3 text-right">
        {showDeleteConfirm ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-red-600 font-medium hover:underline"
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs text-gray-500 hover:underline"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Eliminar
          </button>
        )}
      </td>
    </tr>
  );
}
