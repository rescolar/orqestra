"use client";

import { useState } from "react";
import { createRoomsFromTypes } from "@/lib/actions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bath,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  DoorOpen,
  Users,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type RoomType = {
  id: string;
  capacity: number;
  hasPrivateBathroom: boolean;
  quantity: number;
};

type EditingState = {
  id: string;
  capacity: number;
  hasPrivateBathroom: boolean;
  quantity: number;
};

export function RoomSetupForm({
  eventId,
  estimatedParticipants,
}: {
  eventId: string;
  estimatedParticipants: number;
}) {
  const [types, setTypes] = useState<RoomType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Add form state
  const [newCapacity, setNewCapacity] = useState(2);
  const [newBathroom, setNewBathroom] = useState(false);
  const [newQuantity, setNewQuantity] = useState(1);

  // Edit state
  const [editing, setEditing] = useState<EditingState | null>(null);

  const totalRooms = types.reduce((sum, t) => sum + t.quantity, 0);
  const totalSlots = types.reduce((sum, t) => sum + t.capacity * t.quantity, 0);

  function handleAdd() {
    if (newCapacity < 1 || newQuantity < 1) return;
    setTypes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        capacity: newCapacity,
        hasPrivateBathroom: newBathroom,
        quantity: newQuantity,
      },
    ]);
    // Reset
    setNewCapacity(2);
    setNewBathroom(false);
    setNewQuantity(1);
  }

  function handleDelete(id: string) {
    setTypes((prev) => prev.filter((t) => t.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  function startEdit(t: RoomType) {
    setEditing({
      id: t.id,
      capacity: t.capacity,
      hasPrivateBathroom: t.hasPrivateBathroom,
      quantity: t.quantity,
    });
  }

  function saveEdit() {
    if (!editing || editing.capacity < 1 || editing.quantity < 1) return;
    setTypes((prev) =>
      prev.map((t) =>
        t.id === editing.id
          ? {
              ...t,
              capacity: editing.capacity,
              hasPrivateBathroom: editing.hasPrivateBathroom,
              quantity: editing.quantity,
            }
          : t
      )
    );
    setEditing(null);
  }

  async function handleSubmit() {
    if (types.length === 0) return;
    setSubmitting(true);
    try {
      await createRoomsFromTypes(
        eventId,
        types.map((t) => ({
          capacity: t.capacity,
          hasPrivateBathroom: t.hasPrivateBathroom,
          quantity: t.quantity,
        }))
      );
    } catch (e) {
      // redirect throws — re-throw
      if (e instanceof Error && "digest" in e) throw e;
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="rounded-xl bg-slate-50 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Añadir tipo de habitación
        </h2>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">
              Capacidad
            </label>
            <Input
              type="number"
              min={1}
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value))}
              className="w-20 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Baño</label>
            <button
              type="button"
              onClick={() => setNewBathroom(!newBathroom)}
              className={`flex size-10 items-center justify-center rounded-lg border transition-colors ${
                newBathroom
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 bg-white text-gray-400 hover:border-gray-400"
              }`}
            >
              <Bath className="size-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">
              Cantidad
            </label>
            <Input
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
              className="w-20 bg-white"
            />
          </div>

          <Button onClick={handleAdd} size="sm" className="mb-0.5">
            <Plus className="mr-1 size-4" />
            Añadir
          </Button>
        </div>
      </div>

      {/* Table */}
      {types.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">
                  Capacidad
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">Baño</th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Cantidad
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Plazas totales
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-gray-100 last:border-0 ${
                    editing?.id === t.id
                      ? "bg-primary/5"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {editing?.id === t.id ? (
                    <>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          min={1}
                          value={editing.capacity}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              capacity: Number(e.target.value),
                            })
                          }
                          className="w-20"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              ...editing,
                              hasPrivateBathroom: !editing.hasPrivateBathroom,
                            })
                          }
                          className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                            editing.hasPrivateBathroom
                              ? "border-primary bg-primary text-white"
                              : "border-gray-300 bg-white text-gray-400"
                          }`}
                        >
                          <Bath className="size-3.5" />
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          min={1}
                          value={editing.quantity}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              quantity: Number(e.target.value),
                            })
                          }
                          className="w-20"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {editing.capacity * editing.quantity}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={saveEdit}
                            className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium">{t.capacity}</td>
                      <td className="px-4 py-2.5">
                        {t.hasPrivateBathroom ? (
                          <Bath className="size-4 text-primary" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{t.quantity}</td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {t.capacity * t.quantity}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(t)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary footer */}
          <div className="flex gap-6 border-t border-gray-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <DoorOpen className="size-4 text-gray-400" />
              Total habitaciones: {totalRooms}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <Users className="size-4 text-gray-400" />
              Total plazas: {totalSlots}
            </span>
            {estimatedParticipants > 0 && (
              <span
                className={`text-xs ${
                  totalSlots >= estimatedParticipants
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                ({totalSlots >= estimatedParticipants ? "Cubre" : "Faltan"}{" "}
                {Math.abs(totalSlots - estimatedParticipants)} plazas)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {types.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
          <DoorOpen className="mx-auto size-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-400">
            Añade tipos de habitación para configurar el evento
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={types.length === 0 || submitting}
        >
          {submitting ? "Creando habitaciones..." : "Ir al tablero"}
        </Button>
      </div>
    </div>
  );
}
