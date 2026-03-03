import { getMyProfile } from "@/lib/actions/participant";
import { redirect } from "next/navigation";
import { MyProfileForm } from "@/components/participant/my-profile-form";

export default async function MyProfilePage() {
  const person = await getMyProfile();
  if (!person) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Puedes cambiar tus datos en cualquier momento
        </p>
      </div>
      <MyProfileForm person={person} />
    </div>
  );
}
