"use client";

import { useState, useEffect, useRef } from "react";
import { createRoomsFromTypes, addRoomsToEvent } from "@/lib/actions/event";
import { saveVenueRoomsFromTypes } from "@/lib/actions/venue";
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
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

type RoomType = {
  id: string;
  capacity: number;
  hasPrivateBathroom: boolean;
  quantity: number;
  price?: number;
  dailyRate?: number;
};

type EditingState = {
  id: string;
  capacity: string;
  hasPrivateBathroom: boolean;
  quantity: string;
  price: string;
  dailyRate: string;
};

export function RoomSetupForm({
  eventId,
  estimatedParticipants,
  eventPrice,
  mode = "event",
  venueId,
  initialTypes,
  initialPricingByRoomType,
  onRoomsAdded,
  onPricingChange,
  hideNavigation,
  onTypesChange,
}: {
  eventId?: string;
  estimatedParticipants?: number;
  eventPrice?: number | null;
  mode?: "event" | "venue" | "event-edit";
  venueId?: string;
  initialTypes?: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[];
  initialPricingByRoomType?: boolean;
  onRoomsAdded?: () => void;
  onPricingChange?: (enabled: boolean) => void;
  hideNavigation?: boolean;
  onTypesChange?: (types: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[], pricingByRoomType: boolean) => void;
}) {
  const [types, setTypes] = useState<RoomType[]>(
    () => initialTypes?.map((t) => ({ ...t, id: crypto.randomUUID() })) ?? []
  );

  // Track initial quantities as minimums for event-edit mode
  const [initialMinQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (initialTypes) {
      for (const t of initialTypes) {
        map[`${t.capacity}-${t.hasPrivateBathroom}`] = t.quantity;
      }
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pricingByRoomType, setPricingByRoomType] = useState(initialPricingByRoomType ?? false);

  // Add form state (strings to allow empty field while typing)
  const [newCapacity, setNewCapacity] = useState("2");
  const [newBathroom, setNewBathroom] = useState(false);
  const [newQuantity, setNewQuantity] = useState("1");
  const [newPrice, setNewPrice] = useState("");
  const [newDailyRate, setNewDailyRate] = useState("");

  // Edit state
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [editDuplicateWarning, setEditDuplicateWarning] = useState<string | null>(null);
  const [quantityMinWarning, setQuantityMinWarning] = useState(false);
  const [priceError, setPriceError] = useState(false);

  // Notify parent of types/pricing changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onTypesChange?.(
      types.map((t) => ({
        capacity: t.capacity,
        hasPrivateBathroom: t.hasPrivateBathroom,
        quantity: t.quantity,
        ...(t.price != null && { price: t.price }),
        ...(t.dailyRate != null && { dailyRate: t.dailyRate }),
      })),
      pricingByRoomType
    );
  }, [types, pricingByRoomType]); // eslint-disable-line react-hooks/exhaustive-deps

  const newCapacityNum = parseInt(newCapacity) || 0;
  const newQuantityNum = parseInt(newQuantity) || 0;

  const totalRooms = types.reduce((sum, t) => sum + t.quantity, 0);
  const totalSlots = types.reduce((sum, t) => sum + t.capacity * t.quantity, 0);

  async function handleAdd() {
    if (newCapacityNum < 1 || newQuantityNum < 1) return;

    // Check duplicates BEFORE price validation so warning always shows
    const existing = types.find(
      (t) => t.capacity === newCapacityNum && t.hasPrivateBathroom === newBathroom
    );
    if (existing) {
      setDuplicateWarning("Ya existe este tipo. Edita la cantidad en la tabla.");
      startEdit(existing);
      return;
    }

    if (pricingByRoomType && (!newPrice || parseFloat(newPrice) <= 0)) {
      setPriceError(true);
      return;
    }

    const newType = {
      capacity: newCapacityNum,
      hasPrivateBathroom: newBathroom,
      quantity: newQuantityNum,
      ...(pricingByRoomType && { price: parseFloat(newPrice) }),
      ...(pricingByRoomType && newDailyRate && { dailyRate: parseFloat(newDailyRate) }),
    };

    if (mode === "event-edit" && eventId) {
      setSubmitting(true);
      try {
        await addRoomsToEvent(eventId, [newType], pricingByRoomType);
        // Merge into existing types
        setTypes((prev) => {
          const existing = prev.find(
            (t) => t.capacity === newType.capacity && t.hasPrivateBathroom === newType.hasPrivateBathroom
          );
          if (existing) {
            return prev.map((t) =>
              t.capacity === newType.capacity && t.hasPrivateBathroom === newType.hasPrivateBathroom
                ? { ...t, quantity: t.quantity + newType.quantity }
                : t
            );
          }
          return [...prev, { ...newType, id: crypto.randomUUID() }];
        });
        onRoomsAdded?.();
      } catch {
        // ignore
      } finally {
        setSubmitting(false);
      }
    } else {
      setTypes((prev) => [
        ...prev,
        { ...newType, id: crypto.randomUUID() },
      ]);
    }

    // Reset
    setNewCapacity("2");
    setNewBathroom(false);
    setNewQuantity("1");
    setNewPrice("");
    setNewDailyRate("");
    setDuplicateWarning(null);
    setPriceError(false);
  }

  function handleDelete(id: string) {
    setTypes((prev) => prev.filter((t) => t.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  function startEdit(t: RoomType) {
    // If already editing another row, save it first
    if (editing && editing.id !== t.id) {
      saveEdit();
    }
    setEditDuplicateWarning(null);
    setQuantityMinWarning(false);
    setEditing({
      id: t.id,
      capacity: String(t.capacity),
      hasPrivateBathroom: t.hasPrivateBathroom,
      quantity: String(t.quantity),
      price: t.price != null ? String(t.price) : "",
      dailyRate: t.dailyRate != null ? String(t.dailyRate) : "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    const cap = parseInt(editing.capacity) || 0;
    const qty = parseInt(editing.quantity) || 0;
    if (cap < 1 || qty < 1) return;
    if (pricingByRoomType && (!editing.price || parseFloat(editing.price) <= 0)) return;

    // Enforce minimum quantity in event-edit mode for existing types
    const editTypeKey = `${cap}-${editing.hasPrivateBathroom}`;
    const minQty = initialMinQuantities[editTypeKey];
    if (isEventEdit && minQty != null && qty < minQty) {
      setEditing({ ...editing, quantity: String(minQty) });
      setQuantityMinWarning(true);
      return;
    }
    setQuantityMinWarning(false);

    // Check if another row already has this capacity+bathroom combo
    const duplicate = types.find(
      (t) => t.id !== editing.id && t.capacity === cap && t.hasPrivateBathroom === editing.hasPrivateBathroom
    );
    if (duplicate) {
      setEditDuplicateWarning("Ya existe otro tipo con esa capacidad y baño. Cambia los valores o elimina el duplicado.");
      return;
    }
    setEditDuplicateWarning(null);

    const updatedType = {
      capacity: cap,
      hasPrivateBathroom: editing.hasPrivateBathroom,
      quantity: qty,
      ...(pricingByRoomType && { price: parseFloat(editing.price) }),
      ...(pricingByRoomType && editing.dailyRate ? { dailyRate: parseFloat(editing.dailyRate) } : { dailyRate: undefined }),
    };

    // In event-edit mode, if quantity increased for existing type, add the new rooms
    if (isEventEdit && eventId && minQty != null && qty > minQty) {
      setSubmitting(true);
      try {
        const addCount = qty - minQty;
        await addRoomsToEvent(eventId, [{
          ...updatedType,
          quantity: addCount,
        }], pricingByRoomType);
        // Update the initial min to the new quantity
        initialMinQuantities[editTypeKey] = qty;
        onRoomsAdded?.();
      } catch {
        // ignore
      } finally {
        setSubmitting(false);
      }
    }

    setTypes((prev) =>
      prev.map((t) =>
        t.id === editing.id
          ? { ...t, ...updatedType }
          : t
      )
    );
    setEditing(null);
  }

  async function handleSubmit() {
    if (types.length === 0) return;
    setSubmitting(true);
    try {
      const typeData = types.map((t) => ({
        capacity: t.capacity,
        hasPrivateBathroom: t.hasPrivateBathroom,
        quantity: t.quantity,
        ...(pricingByRoomType && t.price != null && { price: t.price }),
        ...(pricingByRoomType && t.dailyRate != null && { dailyRate: t.dailyRate }),
      }));

      if (mode === "venue" && venueId) {
        await saveVenueRoomsFromTypes(venueId, typeData, pricingByRoomType);
        setSubmitting(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else if (eventId) {
        await createRoomsFromTypes(eventId, typeData, pricingByRoomType);
      }
    } catch (e) {
      // redirect throws — re-throw
      if (e instanceof Error && "digest" in e) throw e;
      setSubmitting(false);
    }
  }

  const showPriceCol = pricingByRoomType;
  const isEventEdit = mode === "event-edit";

  return (
    <div className="space-y-6">
      {/* Pricing toggle */}
      <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 border border-gray-200">
        <button
          type="button"
          role="switch"
          aria-checked={pricingByRoomType}
          onClick={() => {
            const newValue = !pricingByRoomType;
            setPricingByRoomType(newValue);
            onPricingChange?.(newValue);
            // Clear prices when toggling off
            if (pricingByRoomType) {
              setTypes((prev) => prev.map((t) => ({ ...t, price: undefined })));
            }
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            pricingByRoomType ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${
              pricingByRoomType ? "translate-x-6" : "translate-x-0.5"
            } mt-0.5`}
          />
        </button>
        <div>
          <span className="text-sm font-medium text-gray-700">Precio por tipo de habitación</span>
          <p className="text-xs text-gray-500">
            {pricingByRoomType
              ? "Cada tipo de habitación tiene su propio precio."
              : mode === "venue"
                ? "Activa para definir precios por tipo de habitación en la plantilla."
                : isEventEdit
                  ? "Precio fijo para todos los participantes."
                  : eventPrice
                    ? `Precio fijo: ${eventPrice} € por persona.`
                    : "No se ha definido precio. Puedes añadirlo en Detalles."}
          </p>
        </div>
      </div>

      {/* Add form */}
      <div className="rounded-xl bg-slate-50 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Añadir tipo de habitación
        </h2>
        <div className={`grid items-center gap-x-4 gap-y-2 ${
          showPriceCol
            ? "grid-cols-[1fr_auto_1fr_1fr_1fr_auto]"
            : "grid-cols-[1fr_auto_1fr_auto]"
        }`}>
          <label className="text-xs font-medium text-gray-600">Capacidad</label>
          <label className="text-xs font-medium text-gray-600">Baño</label>
          <label className="text-xs font-medium text-gray-600">Cantidad</label>
          {showPriceCol && (
            <label className="text-xs font-medium text-gray-600">Precio €</label>
          )}
          {showPriceCol && (
            <label className="text-xs font-medium text-gray-600">Coste/día €</label>
          )}
          <span />

          <Input
            type="number"
            min={1}
            value={newCapacity}
            onChange={(e) => { setNewCapacity(e.target.value); setDuplicateWarning(null); }}
            className="bg-white"
          />

          <button
            type="button"
            onClick={() => { setNewBathroom(!newBathroom); setDuplicateWarning(null); }}
            className={`flex size-10 items-center justify-center rounded-lg border transition-colors ${
              newBathroom
                ? "border-primary bg-primary text-white"
                : "border-gray-300 bg-white text-gray-400 hover:border-gray-400"
            }`}
          >
            <Bath className="size-4" />
          </button>

          <Input
            type="number"
            min={1}
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            className="bg-white"
          />

          {showPriceCol && (
            <Input
              type="number"
              min={0}
              step={0.01}
              value={newPrice}
              onChange={(e) => { setNewPrice(e.target.value); setPriceError(false); }}
              placeholder="0.00"
              className={`bg-white ${priceError ? "border-red-400 ring-1 ring-red-400" : ""}`}
            />
          )}

          {showPriceCol && (
            <Input
              type="number"
              min={0}
              step={0.01}
              value={newDailyRate}
              onChange={(e) => setNewDailyRate(e.target.value)}
              placeholder="Opcional"
              className="bg-white"
            />
          )}

          <Button onClick={handleAdd} size="sm" disabled={isEventEdit && submitting}>
            <Plus className="mr-1 size-4" />
            {isEventEdit && submitting ? "Añadiendo..." : "Añadir"}
          </Button>
        </div>

        {/* Duplicate warning */}
        {duplicateWarning && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="size-3.5 shrink-0" />
            {duplicateWarning}
          </p>
        )}

        {/* Inline warnings for unusual values */}
        {(newCapacityNum > 9 || newQuantityNum > 99) && (
          <div className="mt-3 flex flex-col gap-1">
            {newCapacityNum > 9 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="size-3.5 shrink-0" />
                Capacidad alta ({newCapacityNum}). ¿Seguro que no es el número de habitaciones?
              </p>
            )}
            {newQuantityNum > 99 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="size-3.5 shrink-0" />
                Más de 99 habitaciones ({newQuantityNum}). Comprueba que el valor es correcto.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {types.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Capacidad</th>
                <th className="px-4 py-3 font-medium text-gray-600">Baño</th>
                <th className="px-4 py-3 font-medium text-gray-600">Cantidad</th>
                {showPriceCol && (
                  <th className="px-4 py-3 font-medium text-gray-600">Precio €</th>
                )}
                {showPriceCol && (
                  <th className="px-4 py-3 font-medium text-gray-600">Coste/día €</th>
                )}
                <th className="px-4 py-3 font-medium text-gray-600">Plazas totales</th>
                <th className="hidden px-4 py-3 font-medium text-gray-600 sm:table-cell">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => {
                const typeKey = `${t.capacity}-${t.hasPrivateBathroom}`;
                const isExistingType = typeKey in initialMinQuantities;
                const minQuantity = initialMinQuantities[typeKey] ?? 1;
                const canEditStructure = !isEventEdit || !isExistingType;
                const canDelete = !isEventEdit || !isExistingType;

                return (
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
                        {canEditStructure ? (
                          <Input
                            type="number"
                            min={1}
                            value={editing.capacity}
                            onChange={(e) =>
                              setEditing({ ...editing, capacity: e.target.value })
                            }
                            className="w-20"
                          />
                        ) : (
                          <span className="font-medium">{editing.capacity}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {canEditStructure ? (
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
                        ) : editing.hasPrivateBathroom ? (
                          <Bath className="size-4 text-primary" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          min={isEventEdit && isExistingType ? minQuantity : 1}
                          value={editing.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseInt(val) || 0;
                            if (isEventEdit && isExistingType && num < minQuantity) {
                              setEditing({ ...editing, quantity: String(minQuantity) });
                              setQuantityMinWarning(true);
                            } else {
                              setEditing({ ...editing, quantity: val });
                              setQuantityMinWarning(false);
                            }
                          }}
                          className={`w-20 ${quantityMinWarning ? "border-red-400 ring-1 ring-red-400" : ""}`}
                        />
                        {quantityMinWarning && (
                          <p className="mt-1 text-[10px] text-red-600">
                            Mín. {minQuantity} (ya creadas)
                          </p>
                        )}
                      </td>
                      {showPriceCol && (
                        <td className="px-4 py-2.5">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editing.price}
                            onChange={(e) =>
                              setEditing({ ...editing, price: e.target.value })
                            }
                            className="w-24"
                          />
                        </td>
                      )}
                      {showPriceCol && (
                        <td className="px-4 py-2.5">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editing.dailyRate}
                            onChange={(e) =>
                              setEditing({ ...editing, dailyRate: e.target.value })
                            }
                            placeholder="Opc."
                            className="w-24"
                          />
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>
                            {(parseInt(editing.capacity) || 0) * (parseInt(editing.quantity) || 0)}
                          </span>
                          {/* Mobile: action buttons inline */}
                          <div className="flex gap-1 sm:hidden">
                            <button
                              onClick={saveEdit}
                              className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                            >
                              <Check className="size-4" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(editing.id)}
                                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setEditing(null)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                        {canEditStructure && (parseInt(editing.capacity) || 0) > 9 && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                            <AlertTriangle className="size-3 shrink-0" />
                            Capacidad alta
                          </p>
                        )}
                        {(parseInt(editing.quantity) || 0) > 99 && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                            <AlertTriangle className="size-3 shrink-0" />
                            +99 habitaciones
                          </p>
                        )}
                        {editDuplicateWarning && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600">
                            <AlertTriangle className="size-3 shrink-0" />
                            {editDuplicateWarning}
                          </p>
                        )}
                      </td>
                      {/* Desktop: action buttons in separate column */}
                      <td className="hidden px-4 py-2.5 sm:table-cell">
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
                      <td
                        className="px-4 py-2.5 font-medium cursor-pointer"
                        onClick={() => startEdit(t)}
                      >
                        {t.capacity}
                      </td>
                      <td
                        className="px-4 py-2.5 cursor-pointer"
                        onClick={() => startEdit(t)}
                      >
                        {t.hasPrivateBathroom ? (
                          <Bath className="size-4 text-primary" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-2.5 cursor-pointer"
                        onClick={() => startEdit(t)}
                      >
                        {t.quantity}
                      </td>
                      {showPriceCol && (
                        <td
                          className="px-4 py-2.5 cursor-pointer"
                          onClick={() => startEdit(t)}
                        >
                          {t.price != null ? `${t.price} €` : "—"}
                        </td>
                      )}
                      {showPriceCol && (
                        <td
                          className="px-4 py-2.5 text-gray-400 cursor-pointer"
                          onClick={() => startEdit(t)}
                        >
                          {t.dailyRate != null ? `${t.dailyRate} €` : "—"}
                        </td>
                      )}
                      <td
                        className="px-4 py-2.5 text-gray-500 cursor-pointer"
                        onClick={() => startEdit(t)}
                      >
                        {t.capacity * t.quantity}
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell">
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(t)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                );
              })}
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
            {estimatedParticipants != null && estimatedParticipants > 0 && (
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
            Añade tipos de habitación para configurar {mode === "venue" ? "el centro" : "el evento"}
          </p>
        </div>
      )}

      {/* Navigation */}
      {!isEventEdit && !hideNavigation && (
        <div className="flex items-center justify-between pt-2">
          {mode === "venue" ? (
            <span />
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="size-4" />
              Atrás
            </Link>
          )}
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check className="size-3.5" />
                Guardado
              </span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={types.length === 0 || submitting}
            >
              {submitting
                ? mode === "venue" ? "Guardando..." : "Creando habitaciones..."
                : mode === "venue" ? "Guardar habitaciones" : "Siguiente"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
