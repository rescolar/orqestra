"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventDetails, updateRoomPricings } from "@/lib/actions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, DoorOpen, Users, Calendar, UtensilsCrossed, Bath } from "lucide-react";
import { SaveAsVenueButton } from "@/components/venue/save-as-venue-button";
import { RoomSetupForm } from "@/components/room-setup-form";
import { ImageUpload } from "@/components/shared/image-upload";
import Link from "next/link";

type RoomPricingRow = {
  capacity: number;
  has_private_bathroom: boolean;
  price: number;
  daily_rate?: number | null;
};

interface EventDetailFormProps {
  isWizard: boolean;
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
    room_types?: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[];
  };
}

function toInputDate(iso: string) {
  return iso.slice(0, 10);
}

export function EventDetailForm({ isWizard, event }: EventDetailFormProps) {
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

  const roomTypes = event.room_types ?? [];

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

      {/* Event image */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <Label>Imagen del evento</Label>
          <ImageUpload
            currentUrl={imageUrl || null}
            onUploaded={(url) => setImageUrl(url)}
            uploadType="event"
            entityId={event.id}
            size="banner"
            shape="square"
          />
        </div>
      </div>

      {/* Centro + Habitaciones — only in edit mode */}
      {!isWizard && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Centro y habitaciones</h3>
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

            {/* Room types — unified component with pricing toggle */}
            <RoomSetupForm
              mode="event-edit"
              eventId={event.id}
              initialTypes={roomTypes}
              initialPricingByRoomType={pricingByRoomType}
              estimatedParticipants={event.estimated_participants}
              onRoomsAdded={() => router.refresh()}
              onPricingChange={(enabled) => setPricingByRoomType(enabled)}
            />

            {/* Pricing fields */}
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meal costs — only in edit mode (wizard has them in step 2) */}
      {!isWizard && (
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
      )}

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
        {isWizard ? (
          <Link
            href={`/events/${event.id}/setup`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </Link>
        ) : (
          <Link
            href={`/events/${event.id}/board`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="size-4" />
            Volver al tablero
          </Link>
        )}
        <div className="flex gap-3">
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
