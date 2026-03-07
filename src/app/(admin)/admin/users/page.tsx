import { getAllUsers } from "@/lib/actions/admin";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Usuarios</h1>
      <UsersTable users={users} />
    </div>
  );
}
