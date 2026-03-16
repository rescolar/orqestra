"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { updateEventDetails, updateRoomPricings, addRoomsByType } from "@/lib/actions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Settings, Calendar, UtensilsCrossed, BedDouble, Bath, Hash, Plus, Calculator } from "lucide-react";
import { SaveAsVenueButton } from "@/components/venue/save-as-venue-button";
import { RoomTypeEditor } from "@/components/venue/room-type-editor";
import { ImageUpload } from "@/components/shared/image-upload";
import { computeNights, computeTotalEventPrice } from "@/lib/pricing";
import { CostSimulatorModal } from "@/components/event/cost-simulator-modal";
import Link from "next/link";
import type { RoomTypeData } from "@/components/venue/venue-edit-client";

type RoomPricingRow = {
  capacity: number;
  has_private_bathroom: boolean;
  price: number;
  daily_rate?: number | null;
};

type VenueRoomType = RoomTypeData & { roomCount: number };

interface EventDetailFormProps {
  isWizard: boolean;
  venueId?: string | null;
  venueRoomTypes?: VenueRoomType[];
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
    pricing_mode?: string;
    facilitation_cost_day?: number | string | null;
    facilitation_cost_half_day?: number | string | null;
    management_cost_day?: number | string | null;
    room_pricings?: RoomPricingRow[];
    meal_cost_breakfast?: number | string | null;
    meal_cost_lunch?: number | string | null;
    meal_cost_dinner?: number | string | null;
    room_types?: { capacity: number; hasPrivateBathroom: boolean; quantity: number; price?: number; dailyRate?: number }[];
    show_accommodation?: boolean;
    show_availability?: boolean;
  };
}

function toInputDate(iso: string) {
  return iso.slice(0, 10);
}

function occupancyLabel(n: number) {
  return n === 1 ? "Individual" : n === 2 ? "Doble" : n === 3 ? "Triple" : `${n} pers.`;
}

export function EventDetailForm({ isWizard, venueId, venueRoomTypes, event }: EventDetailFormProps) {
  const router = useRouter();
  const nights = computeNights(event.date_start, event.date_end);
  const days = nights;

  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [imageUrl, setImageUrl] = useState(event.image_url ?? "");
  const [dateStart, setDateStart] = useState(toInputDate(event.date_start));
  const [dateEnd, setDateEnd] = useState(toInputDate(event.date_end));
  const [eventPrice, setEventPrice] = useState(event.event_price != null ? String(event.event_price) : "");
  const [depositAmount, setDepositAmount] = useState(event.deposit_amount != null ? String(event.deposit_amount) : "");
  const [pricingByRoomType, setPricingByRoomType] = useState(event.pricing_by_room_type ?? false);
  const [pricingMode, setPricingMode] = useState(event.pricing_mode ?? "direct");
  const [facilitationDay, setFacilitationDay] = useState(event.facilitation_cost_day != null ? String(event.facilitation_cost_day) : "");
  const [facilitationHalfDay, setFacilitationHalfDay] = useState(event.facilitation_cost_half_day != null ? String(event.facilitation_cost_half_day) : "");
  const [managementDay, setManagementDay] = useState(event.management_cost_day != null ? String(event.management_cost_day) : "");
  const [roomPricings, setRoomPricings] = useState<RoomPricingRow[]>(event.room_pricings ?? []);
  const [mealBreakfast, setMealBreakfast] = useState(event.meal_cost_breakfast != null ? String(event.meal_cost_breakfast) : "");
  const [mealLunch, setMealLunch] = useState(event.meal_cost_lunch != null ? String(event.meal_cost_lunch) : "");
  const [mealDinner, setMealDinner] = useState(event.meal_cost_dinner != null ? String(event.meal_cost_dinner) : "");
  const [showAccommodation, setShowAccommodation] = useState(event.show_accommodation ?? false);
  const [showAvailability, setShowAvailability] = useState(event.show_availability ?? false);
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [pendingDates, setPendingDates] = useState<{ start?: string; end?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingRoomType, setAddingRoomType] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const hasVenueRoomTypes = venueRoomTypes && venueRoomTypes.length > 0;

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
    pricingChanged ||
    showAccommodation !== (event.show_accommodation ?? false) ||
    showAvailability !== (event.show_availability ?? false);

  // Room type summary
  const totalRooms = useMemo(() => {
    if (!venueRoomTypes) return event.roomCount;
    return venueRoomTypes.reduce((sum, rt) => sum + rt.roomCount, 0);
  }, [venueRoomTypes, event.roomCount]);

  const totalCapacity = useMemo(() => {
    if (!venueRoomTypes) return 0;
    return venueRoomTypes.reduce((sum, rt) => sum + rt.capacity * rt.roomCount, 0);
  }, [venueRoomTypes]);

  // Preview total for a room type
  function previewTotal(rt: { base_price: number | null; occupancy_pricings: { occupancy: number; price: number }[] }, occupancy?: number): number | null {
    let accommodationPerNight: number | null = null;

    if (occupancy != null && rt.occupancy_pricings.length > 0) {
      const match = rt.occupancy_pricings.find((op) => op.occupancy === occupancy);
      if (match) accommodationPerNight = match.price;
    }
    if (accommodationPerNight == null && rt.base_price != null) {
      accommodationPerNight = rt.base_price;
    }
    if (accommodationPerNight == null) return null;

    return computeTotalEventPrice({
      accommodationPerNight,
      nights,
      days,
      pricingMode,
      facilitationCostDay: facilitationDay ? parseFloat(facilitationDay) : null,
      managementCostDay: managementDay ? parseFloat(managementDay) : null,
    });
  }

  const handleDateChange = (field: "start" | "end", value: string) => {
    const newStart = field === "start" ? value : dateStart;
    const newEnd = field === "end" ? value : dateEnd;
    if (newStart > newEnd) return;
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
          pricing_mode: pricingMode,
          facilitation_cost_day: facilitationDay ? parseFloat(facilitationDay) : null,
          facilitation_cost_half_day: facilitationHalfDay ? parseFloat(facilitationHalfDay) : null,
          management_cost_day: managementDay ? parseFloat(managementDay) : null,
          meal_cost_breakfast: mealBreakfast ? parseFloat(mealBreakfast) : null,
          meal_cost_lunch: mealLunch ? parseFloat(mealLunch) : null,
          meal_cost_dinner: mealDinner ? parseFloat(mealDinner) : null,
          show_accommodation: showAccommodation,
          show_availability: showAvailability,
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
      {/* ─── Card: Evento ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {/* Dates */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-gray-400" />
              <Label className="text-sm font-semibold text-gray-700">Fechas</Label>
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
              {nights > 0 && (
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  {nights} {nights === 1 ? "noche" : "noches"}
                </span>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del evento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Description */}
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

          {/* Event image */}
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
      </div>

      {/* ─── Card: Centro (edit mode only) ─────────────────────────────── */}
      {!isWizard && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Centro</h3>
              </div>
              {hasVenueRoomTypes && venueId && (
                <SaveAsVenueButton eventId={event.id} variant="ghost" />
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Casa de retiro, dirección..."
              />
            </div>

            {/* ─── Tipos de Habitación ────────────────────────────────── */}
            {hasVenueRoomTypes && venueId && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <BedDouble className="size-4 text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-700">Tipos de Habitación</h4>
                  {nights > 0 && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                      {nights} {nights === 1 ? "noche" : "noches"}
                    </span>
                  )}
                </div>

                <RoomTypeEditor
                  venueId={venueId}
                  initialRoomTypes={venueRoomTypes!.map((rt) => ({
                    id: rt.id,
                    name: rt.name,
                    description: rt.description,
                    capacity: rt.capacity,
                    has_private_bathroom: rt.has_private_bathroom,
                    base_price: rt.base_price,
                    position: rt.position,
                    occupancy_pricings: rt.occupancy_pricings,
                  }))}
                />

                {/* Price preview per type */}
                {venueRoomTypes!.some((rt) => rt.base_price != null || rt.occupancy_pricings.length > 0) && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Preview: precio total del evento ({nights}n)
                    </p>
                    <div className="space-y-1.5">
                      {venueRoomTypes!.map((rt) => {
                        const hasOcc = rt.occupancy_pricings.length > 0;
                        if (!hasOcc && rt.base_price == null) return null;

                        return (
                          <div key={rt.id} className="text-xs text-gray-600">
                            <span className="font-medium text-gray-700">{rt.name}</span>
                            {hasOcc ? (
                              <span className="ml-2">
                                {rt.occupancy_pricings.map((op) => {
                                  const total = previewTotal(rt, op.occupancy);
                                  return total != null ? `${occupancyLabel(op.occupancy)}: ${total.toFixed(0)}€` : null;
                                }).filter(Boolean).join(" · ")}
                              </span>
                            ) : (
                              (() => {
                                const total = previewTotal(rt);
                                return total != null ? <span className="ml-2">{total.toFixed(0)}€</span> : null;
                              })()
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Habitaciones summary ───────────────────────────────── */}
            {hasVenueRoomTypes && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <Hash className="size-4 text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-700">Habitaciones</h4>
                </div>

                <div className="space-y-2">
                  {venueRoomTypes!.map((rt) => (
                    <div key={rt.id} className="flex items-center gap-3">
                      <div className="flex flex-1 items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {rt.name}
                        </span>
                        <span className="text-xs text-gray-400">({rt.capacity} plazas)</span>
                        {rt.has_private_bathroom && <Bath className="size-3 text-blue-500" />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          {rt.roomCount} hab.
                        </span>
                        <button
                          type="button"
                          disabled={addingRoomType === rt.id}
                          onClick={async () => {
                            setAddingRoomType(rt.id);
                            try {
                              await addRoomsByType(event.id, rt.id, 1);
                            } finally {
                              setAddingRoomType(null);
                            }
                          }}
                          className="flex size-6 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-primary hover:text-primary disabled:opacity-50"
                          title="Añadir habitación"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400">Para eliminar habitaciones, hazlo desde el tablero.</p>

                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                  <div className="flex gap-6 text-sm">
                    <span className="text-gray-600">
                      <span className="font-medium text-gray-900">{totalRooms}</span> habitaciones
                    </span>
                    <span className="text-gray-600">
                      <span className="font-medium text-gray-900">{totalCapacity}</span> plazas
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Estimados: {event.estimated_participants} participantes
                  </span>
                </div>
              </div>
            )}

            {/* Meal costs */}
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="size-3.5 text-gray-400" />
                <Label className="text-xs font-medium text-gray-600">Tarifas de comida (para descuentos)</Label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Desayuno (€)</Label>
                  <Input type="number" step="0.01" min={0} value={mealBreakfast} onChange={(e) => setMealBreakfast(e.target.value)} placeholder="Opcional" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Comida (€)</Label>
                  <Input type="number" step="0.01" min={0} value={mealLunch} onChange={(e) => setMealLunch(e.target.value)} placeholder="Opcional" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cena (€)</Label>
                  <Input type="number" step="0.01" min={0} value={mealDinner} onChange={(e) => setMealDinner(e.target.value)} placeholder="Opcional" className="text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Card: Gestión (edit mode only) ────────────────────────────── */}
      {!isWizard && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Gestión</h3>
            </div>

            {/* Pricing mode */}
            <div className="space-y-2">
              <Label>Cálculo del precio</Label>
              <div className="flex gap-3">
                <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${pricingMode === "direct" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-600"}`}>
                  <input type="radio" name="pricing_mode_edit" value="direct" checked={pricingMode === "direct"} onChange={() => setPricingMode("direct")} className="accent-primary" />
                  Precio Final
                </label>
                <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${pricingMode === "breakdown" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-600"}`}>
                  <input type="radio" name="pricing_mode_edit" value="breakdown" checked={pricingMode === "breakdown"} onChange={() => setPricingMode("breakdown")} className="accent-primary" />
                  Gastos Desglosados
                </label>
              </div>
              <p className="text-xs text-gray-500">
                {pricingMode === "direct"
                  ? "Los precios por noche de cada habitación ya incluyen todos los gastos (facilitación, gestión, etc.)"
                  : "El precio final será el resultado de añadir los gastos de facilitación y gestión al coste de la habitación."}
              </p>
            </div>

            {/* Breakdown costs */}
            {pricingMode === "breakdown" && (
              <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">Gastos por persona y día</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSimulator(true)}
                    className="h-7 gap-1.5 text-xs text-gray-600"
                  >
                    <Calculator className="size-3.5" />
                    Simulador de costes
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Facilitación/día (€)</Label>
                    <Input type="number" step="0.01" min={0} value={facilitationDay} onChange={(e) => setFacilitationDay(e.target.value)} placeholder="€/pers./día" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Facilitación/½ día (€)</Label>
                    <Input type="number" step="0.01" min={0} value={facilitationHalfDay} onChange={(e) => setFacilitationHalfDay(e.target.value)} placeholder="€/pers./½ día" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Gestión/día (€)</Label>
                    <Input type="number" step="0.01" min={0} value={managementDay} onChange={(e) => setManagementDay(e.target.value)} placeholder="€/pers./día" className="text-sm" />
                  </div>
                </div>
              </div>
            )}

            {/* Price per person + Deposit */}
            <div className="grid grid-cols-2 gap-4">
              {!pricingByRoomType && (
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
              )}
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Reserva (€)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Depósito"
                />
              </div>
            </div>

            {/* Participant accommodation toggles */}
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Mostrar opciones de alojamiento a participantes</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAccommodation}
                  onClick={() => {
                    const next = !showAccommodation;
                    setShowAccommodation(next);
                    if (!next) setShowAvailability(false);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showAccommodation ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      showAccommodation ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
              {showAccommodation && (
                <label className="flex items-center justify-between pl-4">
                  <span className="text-sm text-gray-500">Mostrar disponibilidad de plazas</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showAvailability}
                    onClick={() => setShowAvailability(!showAvailability)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showAvailability ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                        showAvailability ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Cost Simulator Modal ──────────────────────────────────────── */}
      {!isWizard && (
        <CostSimulatorModal
          open={showSimulator}
          onOpenChange={setShowSimulator}
          roomTypes={(venueRoomTypes ?? []).map((rt) => ({
            name: rt.name,
            base_price: rt.base_price,
            occupancy_pricings: rt.occupancy_pricings,
          }))}
          nights={nights}
          days={days}
          estimatedParticipants={event.estimated_participants}
          onApply={(value) => setManagementDay(value.toFixed(2))}
        />
      )}

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
