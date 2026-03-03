import { getPersonsDirectory } from "@/lib/actions/directory";
import { PersonDirectory } from "@/components/person-directory";

export default async function PersonsPage() {
  const persons = await getPersonsDirectory();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <PersonDirectory persons={persons} />
    </div>
  );
}
