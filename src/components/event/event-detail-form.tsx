"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventDetails, updateRoomPricings } from "@/lib/actions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, DoorOpen, Users, Calendar, ImageIcon, UtensilsCrossed, Bath, Plus } from "lucide-react";
import { addRoomsToEvent } from "@/lib/actions/event";
import { SaveAsVenueButton } from "@/components/venue/save-as-venue-button";
import Link from "next/link";

type RoomPricingRow = {
  capacity: number;
  has_private_bathroom: boolean;
  price: number;
  daily_rate?: number | null;
};

interface EventDetailFormProps {
  event: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    image_url: string | null;
    date_start: string;
    date_end: string;
    estimated_participants: number;
    roomCount: number;
    event_price: number | string | null;
    deposit_amount: number | string | null;
    pricing_by_room_type?: boolean;
    room_pricings?: RoomPricingRow[];
    meal_cost_breakfast?: number | string | null;
    meal_cost_lunch?: number | string | null;
    meal_cost_dinner?: number | string | null;
    room_types?: { capacity: number; hasPrivateBathroom: boolean; quantity: number }[];
  };
}

function toInputDate(iso: string) {
  return iso.slice(0, 10);
}

export function EventDetailForm({ event }: EventDetailFormProps) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [imageUrl, setImageUrl] = useState(event.image_url ?? "");
  const [dateStart, setDateStart] = useState(toInputDate(event.date_start));
  const [dateEnd, setDateEnd] = useState(toInputDate(event.date_end));
  const [eventPrice, setEventPrice] = useState(event.event_price != null ? String(event.event_price) : "");
  const [depositAmount, setDepositAmount] = useState(event.deposit_amount != null ? String(event.deposit_amount) : "");
  const [pricingByRoomType, setPricingByRoomType] = useState(event.pricing_by_room_type ?? false);
  const [roomPricings, setRoomPricings] = useState<RoomPricingRow[]>(event.room_pricings ?? []);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [editingDailyRates, setEditingDailyRates] = useState<Record<string, string>>({});
  const [mealBreakfast, setMealBreakfast] = useState(event.meal_cost_breakfast != null ? String(event.meal_cost_breakfast) : "");
  const [mealLunch, setMealLunch] = useState(event.meal_cost_lunch != null ? String(event.meal_cost_lunch) : "");
  const [mealDinner, setMealDinner] = useState(event.meal_cost_dinner != null ? String(event.meal_cost_dinner) : "");
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [pendingDates, setPendingDates] = useState<{ start?: string; end?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Room types state
  const [roomTypes, setRoomTypes] = useState(event.room_types ?? []);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newCapacity, setNewCapacity] = useState("2");
  const [newBathroom, setNewBathroom] = useState(false);
  const [newQuantity, setNewQuantity] = useState("1");
  const [addingRooms, setAddingRooms] = useState(false);

  const originalDateStart = toInputDate(event.date_start);
  const originalDateEnd = toInputDate(event.date_end);
  const datesChanged = dateStart !== originalDateStart || dateEnd !== originalDateEnd;

  const originalPrice = event.event_price != null ? String(event.event_price) : "";
  const originalDeposit = event.deposit_amount != null ? String(event.deposit_amount) : "";
  const pricingModeChanged = pricingByRoomType !== (event.pricing_by_room_type ?? false);
  const roomPricingsChanged = JSON.stringify(roomPricings) !== JSON.stringify(event.room_pricings ?? []);
  const originalMealBreakfast = event.meal_cost_breakfast != null ? String(event.meal_cost_breakfast) : "";
  const originalMealLunch = event.meal_cost_lunch != null ? String(event.meal_cost_lunch) : "";
  const originalMealDinner = event.meal_cost_dinner != null ? String(event.meal_cost_dinner) : "";
  const mealCostsChanged = mealBreakfast !== originalMealBreakfast || mealLunch !== originalMealLunch || mealDinner !== originalMealDinner;
  const pricingChanged = eventPrice !== originalPrice || depositAmount !== originalDeposit || pricingModeChanged || roomPricingsChanged || mealCostsChanged;

  const isDirty =
    name !== event.name ||
    description !== (event.description ?? "") ||
    location !== (event.location ?? "") ||
    imageUrl !== (event.image_url ?? "") ||
    datesChanged ||
    pricingChanged;

  const handleDateChange = (field: "start" | "end", value: string) => {
    const newStart = field === "start" ? value : dateStart;
    const newEnd = field === "end" ? value : dateEnd;

    if (newStart > newEnd) return; // Prevent invalid range

    setPendingDates({ start: newStart, end: newEnd });
    setShowDateConfirm(true);
  };

  const confirmDateChange = () => {
    if (pendingDates?.start) setDateStart(pendingDates.start);
    if (pendingDates?.end) setDateEnd(pendingDates.end);
    setShowDateConfirm(false);
    setPendingDates(null);
  };

  const cancelDateChange = () => {
    setShowDateConfirm(false);
    setPendingDates(null);
  };

  async function handleAddRooms() {
    const cap = parseInt(newCapacity) || 0;
    const qty = parseInt(newQuantity) || 0;
    if (cap < 1 || qty < 1) return;
    setAddingRooms(true);
    try {
      await addRoomsToEvent(
        event.id,
        [{ capacity: cap, hasPrivateBathroom: newBathroom, quantity: qty }],
        pricingByRoomType
      );
      // Update local state
      const key = `${cap}-${newBathroom}`;
      setRoomTypes((prev) => {
        const existing = prev.find(
          (t) => t.capacity === cap && t.hasPrivateBathroom === newBathroom
        );
        if (existing) {
          return prev.map((t) =>
            t.capacity === cap && t.hasPrivateBathroom === newBathroom
              ? { ...t, quantity: t.quantity + qty }
              : t
          );
        }
        return [...prev, { capacity: cap, hasPrivateBathroom: newBathroom, quantity: qty }];
      });
      setNewCapacity("2");
      setNewBathroom(false);
      setNewQuantity("1");
      setShowAddRoom(false);
    } catch (e) {
      // ignore
    } finally {
      setAddingRooms(false);
    }
  }

  async function handleSaveAndGo() {
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (isDirty) {
        await updateEventDetails(event.id, {
          name: name.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          image_url: imageUrl.trim() || null,
          ...(datesChanged && { date_start: dateStart, date_end: dateEnd }),
          event_price: eventPrice ? parseFloat(eventPrice) : null,
          deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
          pricing_by_room_type: pricingByRoomType,
          meal_cost_breakfast: mealBreakfast ? parseFloat(mealBreakfast) : null,
          meal_cost_lunch: mealLunch ? parseFloat(mealLunch) : null,
          meal_cost_dinner: mealDinner ? parseFloat(mealDinner) : null,
        });
        if (pricingByRoomType && (pricingModeChanged || roomPricingsChanged)) {
          await updateRoomPricings(
            event.id,
            roomPricings.map((rp) => ({
              capacity: rp.capacity,
              has_private_bathroom: rp.has_private_bathroom,
              price: rp.price,
              daily_rate: rp.daily_rate ?? null,
            }))
          );
        }
      }
      router.push(`/events/${event.id}/board`);
    } catch (e) {
      if (e instanceof Error && "digest" in e) throw e;
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Image URL + Preview */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image_url">Imagen del evento (URL)</Label>
            <Input
              id="image_url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {imageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl.trim()}
                alt="Vista previa"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`flex flex-col items-center gap-2 text-gray-400 ${imageUrl.trim() ? "hidden" : ""}`}>
              <ImageIcon className="size-10" />
              <span className="text-sm">Sin imagen</span>
            </div>
          </div>
        </div>
      </div>

      {/* Name + Description */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del evento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu evento..."
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>
      </div>

      {/* Centro */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Centro</h3>
            </div>
            {roomTypes.length > 0 && (
              <SaveAsVenueButton eventId={event.id} variant="ghost" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Casa de retiro, dirección..."
            />
          </div>

          {/* Room types */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Habitaciones</Label>
              <button
                type="button"
                onClick={() => setShowAddRoom(!showAddRoom)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
              >
                <Plus className="size-3.5" />
                Añadir tipo
              </button>
            </div>
            {roomTypes.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Capacidad</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Baño</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Cantidad</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Plazas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roomTypes.map((t) => (
                      <tr key={`${t.capacity}-${t.hasPrivateBathroom}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{t.capacity}</td>
                        <td className="px-3 py-2">
                          {t.hasPrivateBathroom ? (
                            <Bath className="size-3.5 text-primary" />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{t.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{t.capacity * t.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50 text-xs text-gray-500">
                      <td colSpan={2} className="px-3 py-2 font-medium">Total</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {roomTypes.reduce((s, t) => s + t.quantity, 0)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {roomTypes.reduce((s, t) => s + t.capacity * t.quantity, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin habitaciones configuradas.</p>
            )}

            {/* Add room inline form */}
            {showAddRoom && (
              <div className="flex items-end gap-3 rounded-lg border border-dashed border-gray-300 bg-slate-50 p-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Capacidad</label>
                  <Input
                    type="number"
                    min={1}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-20 bg-white"
                  />
                </div>
                <div className="space-y-1">
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Cantidad</label>
                  <Input
                    type="number"
                    min={1}
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-20 bg-white"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleAddRooms}
                  disabled={addingRooms}
                >
                  {addingRooms ? "Añadiendo..." : "Añadir"}
                </Button>
              </div>
            )}
          </div>

          {/* Pricing mode toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Precio por tipo de habitación</p>
              <p className="text-xs text-gray-500">
                {pricingByRoomType
                  ? "Cada tipo de habitación tiene su precio"
                  : "Precio fijo para todos los participantes"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pricingByRoomType}
              onClick={() => setPricingByRoomType(!pricingByRoomType)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                pricingByRoomType ? "bg-primary" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform ${
                  pricingByRoomType ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {!pricingByRoomType ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_price">Precio por persona (€)</Label>
                <Input
                  id="event_price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={eventPrice}
                  onChange={(e) => setEventPrice(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Reserva (€)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Reserva (€)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Opcional"
                  className="max-w-[200px]"
                />
              </div>
              {roomPricings.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Ocupación</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Baño</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Precio €</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Coste/día €</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {roomPricings.map((rp, idx) => {
                        const key = `${rp.capacity}-${rp.has_private_bathroom}`;
                        const editValue = editingPrices[key];
                        return (
                          <tr key={key} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-700">
                              {rp.capacity} {rp.capacity === 1 ? "persona" : "personas"}
                            </td>
                            <td className="px-3 py-2">
                              {rp.has_private_bathroom ? (
                                <span className="inline-flex items-center gap-1 text-primary">
                                  <Bath className="size-3.5" /> Privado
                                </span>
                              ) : (
                                <span className="text-gray-400">Compartido</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={editValue ?? String(rp.price)}
                                onChange={(e) => {
                                  setEditingPrices((prev) => ({ ...prev, [key]: e.target.value }));
                                }}
                                onBlur={() => {
                                  const val = parseFloat(editingPrices[key] ?? "");
                                  if (!isNaN(val) && val >= 0) {
                                    setRoomPricings((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, price: val } : p))
                                    );
                                  }
                                  setEditingPrices((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                }}
                                className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={editingDailyRates[key] ?? (rp.daily_rate != null ? String(rp.daily_rate) : "")}
                                onChange={(e) => {
                                  setEditingDailyRates((prev) => ({ ...prev, [key]: e.target.value }));
                                }}
                                onBlur={() => {
                                  const raw = editingDailyRates[key];
                                  const val = raw ? parseFloat(raw) : null;
                                  setRoomPricings((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, daily_rate: val != null && !isNaN(val) && val >= 0 ? val : null } : p))
                                  );
                                  setEditingDailyRates((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                }}
                                placeholder="Opc."
                                className="w-24 rounded border border-gray-200 px-2 py-1 text-right text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No hay tipos de habitación definidos. Configúralos en el paso de habitaciones.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meal costs */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Tarifas de comida (para descuentos)</h3>
          </div>
          <p className="text-xs text-gray-500">
            Si un participante no asiste a algunas comidas, se le descontará del precio total.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="meal_breakfast" className="text-xs">Desayuno (€)</Label>
              <Input
                id="meal_breakfast"
                type="number"
                step="0.01"
                min={0}
                value={mealBreakfast}
                onChange={(e) => setMealBreakfast(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meal_lunch" className="text-xs">Comida (€)</Label>
              <Input
                id="meal_lunch"
                type="number"
                step="0.01"
                min={0}
                value={mealLunch}
                onChange={(e) => setMealLunch(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meal_dinner" className="text-xs">Cena (€)</Label>
              <Input
                id="meal_dinner"
                type="number"
                step="0.01"
                min={0}
                value={mealDinner}
                onChange={(e) => setMealDinner(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary with editable dates */}
      <div className="rounded-xl bg-slate-50 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Resumen
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="size-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateStart}
                max={dateEnd}
                onChange={(e) => handleDateChange("start", e.target.value)}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-sm text-gray-400">–</span>
              <input
                type="date"
                value={dateEnd}
                min={dateStart}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <DoorOpen className="size-4 text-gray-400" />
              <span>{event.roomCount} habitaciones</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="size-4 text-gray-400" />
              <span>{event.estimated_participants} participantes est.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date change confirmation dialog */}
      {showDateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2 text-warning">
              <Calendar className="size-5" />
              <h3 className="text-lg font-semibold text-gray-900">
                Cambiar fechas
              </h3>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              Cambiar las fechas del evento puede afectar al programa de actividades si ya está configurado.
            </p>
            <p className="mb-6 text-sm text-gray-600">
              ¿Deseas continuar?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDateChange}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDateChange}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href={`/events/${event.id}/setup`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Link>
        <div className="flex gap-3">
          <Link href={`/events/${event.id}/kitchen`}>
            <Button variant="outline" size="sm">
              <UtensilsCrossed className="mr-1 size-4" />
              Informe cocina
            </Button>
          </Link>
          {!isDirty && (
            <Link href={`/events/${event.id}/board`}>
              <Button variant="outline">Ir al tablero</Button>
            </Link>
          )}
          {isDirty && (
            <Button onClick={handleSaveAndGo} disabled={saving}>
              {saving ? "Guardando..." : "Guardar e ir al tablero"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
