"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { PersonFormDialog } from "@/components/person-form-dialog";
import {
  createPerson,
  updatePerson,
  deletePerson,
} from "@/lib/actions/directory";
import type { Gender } from "@prisma/client";

type PersonRow = {
  id: string;
  name_full: string;
  name_display: string;
  name_initials: string;
  gender: Gender;
  default_role: string;
  contact_email: string | null;
  contact_phone: string | null;
  _count: { event_persons: number };
};

interface PersonDirectoryProps {
  persons: PersonRow[];
}

const GENDER_LABELS: Record<string, string> = {
  female: "Mujer",
  male: "Hombre",
  other: "Otro",
  unknown: "—",
};

const ROLE_LABELS: Record<string, string> = {
  participant: "Participante",
  facilitator: "Facilitador",
};

type RoleFilter = "all" | "participant" | "facilitator";
type GenderFilter = "all" | Gender;

export function PersonDirectory({ persons }: PersonDirectoryProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<PersonRow | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<PersonRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");

  const filtered = useMemo(() => {
    return persons.filter((p) => {
      if (roleFilter !== "all" && p.default_role !== roleFilter) return false;
      if (genderFilter !== "all" && p.gender !== genderFilter) return false;
      return true;
    });
  }, [persons, roleFilter, genderFilter]);

  const columns: Column<PersonRow>[] = [
    {
      key: "name_full",
      header: "Nombre",
      sortable: true,
      render: (p) => (
        <span className="font-medium text-gray-900">{p.name_full}</span>
      ),
    },
    {
      key: "gender",
      header: "Género",
      sortable: true,
      render: (p) => GENDER_LABELS[p.gender] ?? p.gender,
    },
    {
      key: "default_role",
      header: "Rol",
      sortable: true,
      render: (p) => ROLE_LABELS[p.default_role] ?? p.default_role,
    },
    {
      key: "contact_email",
      header: "Email",
      render: (p) => (
        <span className="text-gray-500">{p.contact_email ?? "—"}</span>
      ),
    },
    {
      key: "contact_phone",
      header: "Teléfono",
      render: (p) => (
        <span className="text-gray-500">{p.contact_phone ?? "—"}</span>
      ),
      className: "hidden sm:table-cell",
    },
    {
      key: "_count",
      header: "Eventos",
      sortable: false,
      render: (p) => p._count.event_persons,
    },
  ];

  function handleDelete() {
    if (!deletingPerson) return;
    startTransition(async () => {
      await deletePerson(deletingPerson.id);
      setDeletingPerson(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Directorio de Personas</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Crear persona
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Rol:</span>
          {(["all", "participant", "facilitator"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                roleFilter === r
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r === "all" ? "Todos" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Género:</span>
          {(["all", "female", "male", "other", "unknown"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                genderFilter === g
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {g === "all" ? "Todos" : GENDER_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <DataTable<PersonRow>
        data={filtered}
        columns={columns}
        searchPlaceholder="Buscar por nombre, email..."
        searchFn={(item, query) =>
          item.name_full.toLowerCase().includes(query) ||
          (item.contact_email?.toLowerCase().includes(query) ?? false)
        }
        emptyMessage="No se encontraron personas"
        actions={(person) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setEditPerson(person)}
              aria-label="Editar"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setDeletingPerson(person)}
              aria-label="Eliminar"
              className="hover:text-red-600"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      />

      {/* Create dialog */}
      <PersonFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Crear persona"
        onSubmit={async (data) => {
          await createPerson({
            name_full: data.name_full,
            gender: data.gender,
            default_role: data.default_role,
            contact_email: data.contact_email || null,
            contact_phone: data.contact_phone || null,
          });
        }}
      />

      {/* Edit dialog */}
      {editPerson && (
        <PersonFormDialog
          key={editPerson.id}
          open={!!editPerson}
          onOpenChange={(open) => { if (!open) setEditPerson(null); }}
          title="Editar persona"
          initial={{
            name_full: editPerson.name_full,
            gender: editPerson.gender,
            default_role: editPerson.default_role as "participant" | "facilitator",
            contact_email: editPerson.contact_email ?? "",
            contact_phone: editPerson.contact_phone ?? "",
          }}
          onSubmit={async (data) => {
            await updatePerson(editPerson.id, {
              name_full: data.name_full,
              gender: data.gender,
              default_role: data.default_role,
              contact_email: data.contact_email || null,
              contact_phone: data.contact_phone || null,
            });
            setEditPerson(null);
          }}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deletingPerson} onOpenChange={(open) => { if (!open) setDeletingPerson(null); }}>
        <DialogContent className="bg-white sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Eliminar persona</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a{" "}
              <span className="font-semibold text-gray-900">
                {deletingPerson?.name_full}
              </span>
              ? Se eliminará de todos los eventos en los que participa. Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingPerson(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
