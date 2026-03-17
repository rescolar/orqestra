"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRoomType,
  updateRoomType,
  deleteRoomType,
} from "@/lib/actions/venue";
import {
  Plus,
  Trash2,
  Bath,
  ChevronDown,
  ChevronUp,
  Check,
  Pencil,
} from "lucide-react";
import type { RoomTypeData } from "./venue-edit-client";

interface OccupancyRow {
  occupancy: number;
  price: string;
}

export function RoomTypeEditor({
  venueId,
  initialRoomTypes,
}: {
  venueId: string;
  initialRoomTypes: RoomTypeData[];
}) {
  const [roomTypes, setRoomTypes] = useState(initialRoomTypes);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {roomTypes.length === 0 && !showAddForm && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
          <p className="text-sm text-gray-400">No hay tipos de habitación</p>
          <p className="mt-1 text-xs text-gray-400">
            Añade tipos para definir las opciones de alojamiento
          </p>
        </div>
      )}

      {roomTypes.map((rt) => (
        <RoomTypeCard
          key={rt.id}
          roomType={rt}
          expanded={expandedId === rt.id}
          onToggle={() => setExpandedId(expandedId === rt.id ? null : rt.id)}
          onUpdate={(updated) => {
            setRoomTypes((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          }}
          onDelete={() => {
            setRoomTypes((prev) => prev.filter((t) => t.id !== rt.id));
          }}
        />
      ))}

      {showAddForm ? (
        <AddRoomTypeForm
          venueId={venueId}
          onCreated={(rt) => {
            setRoomTypes((prev) => [...prev, rt]);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="w-full border-dashed"
        >
          <Plus className="mr-1.5 size-4" />
          Añadir tipo de habitación
        </Button>
      )}
    </div>
  );
}

function RoomTypeCard({
  roomType,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  roomType: RoomTypeData;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (rt: RoomTypeData) => void;
  onDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(roomType.name);
  const [description, setDescription] = useState(roomType.description ?? "");
  const [capacity, setCapacity] = useState(String(roomType.capacity));
  const [bathroom, setBathroom] = useState(roomType.has_private_bathroom);
  const [basePrice, setBasePrice] = useState(
    roomType.base_price != null ? String(roomType.base_price) : ""
  );
  const [occupancies, setOccupancies] = useState<OccupancyRow[]>(
    roomType.occupancy_pricings.map((op) => ({
      occupancy: op.occupancy,
      price: String(op.price),
    }))
  );
  const [showOccupancies, setShowOccupancies] = useState(
    roomType.occupancy_pricings.length > 0
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave() {
    const cap = parseInt(capacity);
    if (!name.trim() || isNaN(cap) || cap < 1) return;

    startTransition(async () => {
      const data: Parameters<typeof updateRoomType>[1] = {
        name: name.trim(),
        description: description.trim() || null,
        capacity: cap,
        has_private_bathroom: bathroom,
        base_price: !showOccupancies && basePrice ? parseFloat(basePrice) : null,
        occupancy_pricings: showOccupancies
          ? occupancies
              .filter((o) => o.price && !isNaN(parseFloat(o.price)))
              .map((o) => ({
                occupancy: o.occupancy,
                price: parseFloat(o.price),
              }))
          : [],
      };

      const updated = await updateRoomType(roomType.id, data);
      onUpdate({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        capacity: updated.capacity,
        has_private_bathroom: updated.has_private_bathroom,
        base_price: updated.base_price != null ? Number(updated.base_price) : null,
        position: updated.position,
        occupancy_pricings: updated.occupancy_pricings.map((op) => ({
          occupancy: op.occupancy,
          price: Number(op.price),
        })),
      });
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteRoomType(roomType.id);
      onDelete();
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={onToggle}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{roomType.name}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {roomType.capacity} plazas
            </span>
            {roomType.has_private_bathroom && (
              <Bath className="size-3.5 text-blue-500" />
            )}
          </div>
          {(roomType.base_price != null || roomType.occupancy_pricings.length > 0) && (
            <p className="mt-0.5 text-xs text-gray-500">
              {roomType.occupancy_pricings.length > 0
                ? roomType.occupancy_pricings.map((op) => {
                    const label = op.occupancy === 1 ? "Ind" : op.occupancy === 2 ? "Doble" : op.occupancy === 3 ? "Triple" : `${op.occupancy}p`;
                    return `${label}: ${op.price}€`;
                  }).join(" · ")
                : `${roomType.base_price}€/pers/noche`}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-gray-400" />
        ) : (
          <ChevronDown className="size-4 text-gray-400" />
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Capacidad</Label>
                  <Input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descripción</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción opcional..."
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bathroom}
                    onChange={(e) => setBathroom(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Bath className="size-3.5 text-blue-500" />
                  Baño privado
                </label>
              </div>
              {/* Pricing mode: single vs occupancy */}
              <div className="space-y-2">
                <Label className="text-xs">Precio (€/persona/noche)</Label>
                <div className="flex gap-2">
                  <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${!showOccupancies ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500"}`}>
                    <input type="radio" checked={!showOccupancies} onChange={() => setShowOccupancies(false)} className="accent-primary" />
                    Precio único
                  </label>
                  <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${showOccupancies ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500"}`}>
                    <input type="radio" checked={showOccupancies} onChange={() => {
                      setShowOccupancies(true);
                      setBasePrice("");
                      if (occupancies.length === 0) {
                        const cap = parseInt(capacity) || 2;
                        const rows: OccupancyRow[] = [];
                        for (let i = 1; i <= Math.min(cap, 4); i++) {
                          rows.push({ occupancy: i, price: "" });
                        }
                        setOccupancies(rows);
                      }
                    }} className="accent-primary" />
                    Por ocupación
                  </label>
                </div>
                {!showOccupancies ? (
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="€ por persona y noche"
                    className="h-8 w-40 text-sm"
                  />
                ) : (
                  <div className="space-y-2">
                    {occupancies.map((o, idx) => (
                      <div key={o.occupancy} className="flex items-center gap-2">
                        <span className="w-24 text-xs text-gray-600">
                          {o.occupancy === 1
                            ? "Individual"
                            : o.occupancy === 2
                              ? "Doble"
                              : o.occupancy === 3
                                ? "Triple"
                                : `${o.occupancy} pers.`}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={o.price}
                          onChange={(e) => {
                            const next = [...occupancies];
                            next[idx] = { ...o, price: e.target.value };
                            setOccupancies(next);
                          }}
                          placeholder="€/pers/noche"
                          className="h-7 w-28 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                >
                  <Check className="mr-1 size-3.5" />
                  {isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {roomType.description && (
                <p className="text-sm text-gray-600">{roomType.description}</p>
              )}
              {roomType.occupancy_pricings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">
                    Precios por ocupación
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roomType.occupancy_pricings.map((op) => (
                      <span
                        key={op.occupancy}
                        className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs text-gray-700"
                      >
                        {op.occupancy === 1
                          ? "Individual"
                          : op.occupancy === 2
                            ? "Doble"
                            : op.occupancy === 3
                              ? "Triple"
                              : `${op.occupancy} pers.`}
                        : {op.price}€
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="mr-1 size-3.5" />
                  Editar
                </Button>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">¿Eliminar?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      Sí
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDelete(false)}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(true)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="mr-1 size-3.5" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddRoomTypeForm({
  venueId,
  onCreated,
  onCancel,
}: {
  venueId: string;
  onCreated: (rt: RoomTypeData) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [bathroom, setBathroom] = useState(false);
  const [basePrice, setBasePrice] = useState("");
  const [showOccupancies, setShowOccupancies] = useState(false);
  const [occupancies, setOccupancies] = useState<OccupancyRow[]>([
    { occupancy: 1, price: "" },
    { occupancy: 2, price: "" },
  ]);

  function handleSubmit() {
    const cap = parseInt(capacity);
    if (!name.trim() || isNaN(cap) || cap < 1) return;

    startTransition(async () => {
      const rt = await createRoomType(venueId, {
        name: name.trim(),
        description: description.trim() || null,
        capacity: cap,
        has_private_bathroom: bathroom,
        base_price: !showOccupancies && basePrice ? parseFloat(basePrice) : null,
        occupancy_pricings: showOccupancies
          ? occupancies
              .filter((o) => o.price && !isNaN(parseFloat(o.price)))
              .map((o) => ({
                occupancy: o.occupancy,
                price: parseFloat(o.price),
              }))
          : [],
      });

      onCreated({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        capacity: rt.capacity,
        has_private_bathroom: rt.has_private_bathroom,
        base_price: rt.base_price != null ? Number(rt.base_price) : null,
        position: rt.position,
        occupancy_pricings: rt.occupancy_pricings.map((op) => ({
          occupancy: op.occupancy,
          price: Number(op.price),
        })),
      });
    });
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-900">
        Nuevo tipo de habitación
      </h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Doble Superior"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Capacidad</Label>
            <Input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descripción</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Habitación con vistas al jardín..."
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bathroom}
              onChange={(e) => setBathroom(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Bath className="size-3.5 text-blue-500" />
            Baño privado
          </label>
        </div>
        {/* Pricing mode: single vs occupancy */}
        <div className="space-y-2">
          <Label className="text-xs">Precio (€/persona/noche)</Label>
          <div className="flex gap-2">
            <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${!showOccupancies ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500"}`}>
              <input type="radio" checked={!showOccupancies} onChange={() => setShowOccupancies(false)} className="accent-primary" />
              Precio único
            </label>
            <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${showOccupancies ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500"}`}>
              <input type="radio" checked={showOccupancies} onChange={() => {
                setShowOccupancies(true);
                setBasePrice("");
                const cap = parseInt(capacity) || 2;
                const rows: OccupancyRow[] = [];
                for (let i = 1; i <= Math.min(cap, 4); i++) {
                  const existing = occupancies.find((o) => o.occupancy === i);
                  rows.push({ occupancy: i, price: existing?.price ?? "" });
                }
                setOccupancies(rows);
              }} className="accent-primary" />
              Por ocupación
            </label>
          </div>
          {!showOccupancies ? (
            <Input
              type="number"
              step="0.01"
              min={0}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="€ por persona y noche"
              className="h-8 w-40 text-sm"
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                Precio diferente según cuántas personas usen la habitación
              </p>
              {occupancies.map((o, idx) => (
                <div key={o.occupancy} className="flex items-center gap-2">
                  <span className="w-24 text-xs text-gray-600">
                    {o.occupancy === 1
                      ? "Individual"
                      : o.occupancy === 2
                        ? "Doble"
                        : o.occupancy === 3
                          ? "Triple"
                          : `${o.occupancy} pers.`}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={o.price}
                    onChange={(e) => {
                      const next = [...occupancies];
                      next[idx] = { ...o, price: e.target.value };
                      setOccupancies(next);
                    }}
                    placeholder="€/pers/noche"
                    className="h-7 w-28 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSubmit} disabled={isPending}>
            <Plus className="mr-1 size-3.5" />
            {isPending ? "Creando..." : "Crear tipo"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
