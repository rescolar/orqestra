import { getAllUsers } from "@/lib/actions/admin";
import { UsersTable } from "@/components/admin/users-table";
import { AdminInviteButton } from "@/components/admin/admin-invite-button";

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <AdminInviteButton />
      </div>
      <UsersTable users={users} />
    </div>
  );
}
