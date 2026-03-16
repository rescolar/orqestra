"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { saveEventSetupFields, createEventWithRoomTypes } from "@/lib/actions/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building2,
  Settings,
  UtensilsCrossed,
  Plus,
  Trash2,
  Bath,
  ChevronDown,
  ChevronUp,
  BedDouble,
  Hash,
  Calculator,
} from "lucide-react";
import Link from "next/link";
import { computeNights, computeTotalEventPrice } from "@/lib/pricing";
import { CostSimulatorModal } from "@/components/event/cost-simulator-modal";

// ─── Types ──────────────────────────────────────────────────────────────────

type OccupancyRow = { occupancy: number; price: string };

type LocalRoomType = {
  tempId: string;
  name: string;
  description: string;
  capacity: number;
  has_private_bathroom: boolean;
  base_price: string;
  occupancy_pricings: OccupancyRow[];
  showOccupancies: boolean;
};

type Quantities = Record<string, number>; // tempId → quantity

interface SetupStepClientProps {
  event: {
    id: string;
    name: string;
    estimated_participants: number;
    date_start: string;
    date_end: string;
    location: string | null;
    event_price: number | null;
    deposit_amount: number | null;
    pricing_by_room_type: boolean;
    pricing_mode: string;
    facilitation_cost_day: number | null;
    management_cost_day: number | null;
    meal_cost_breakfast: number | null;
    meal_cost_lunch: number | null;
    meal_cost_dinner: number | null;
  };
  hasExistingRooms: boolean;
  initialRoomTypes?: {
    name: string;
    description: string | null;
    capacity: number;
    has_private_bathroom: boolean;
    base_price: number | null;
    occupancy_pricings: { occupancy: number; price: number }[];
  }[];
  initialQuantities?: Record<string, number>;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function occupancyLabel(n: number) {
  return n === 1 ? "Individual" : n === 2 ? "Doble" : n === 3 ? "Triple" : `${n} pers.`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SetupStepClient({
  event,
  hasExistingRooms,
  initialRoomTypes,
  initialQuantities,
}: SetupStepClientProps) {
  const router = useRouter();
  const nights = computeNights(event.date_start, event.date_end);
  const days = nights; // days of facilitation ≈ nights

  // ─── Section 1: Gastos del Evento ───────────────────────────────────────
  const [location, setLocation] = useState(event.location ?? "");
  const [pricingMode, setPricingMode] = useState(event.pricing_mode || "direct");
  const [facilitationDay, setFacilitationDay] = useState(event.facilitation_cost_day != null ? String(event.facilitation_cost_day) : "");
  const [managementDay, setManagementDay] = useState(event.management_cost_day != null ? String(event.management_cost_day) : "");
  const [depositAmount, setDepositAmount] = useState(event.deposit_amount != null ? String(event.deposit_amount) : "");
  const [mealBreakfast, setMealBreakfast] = useState(event.meal_cost_breakfast != null ? String(event.meal_cost_breakfast) : "");
  const [mealLunch, setMealLunch] = useState(event.meal_cost_lunch != null ? String(event.meal_cost_lunch) : "");
  const [mealDinner, setMealDinner] = useState(event.meal_cost_dinner != null ? String(event.meal_cost_dinner) : "");

  // ─── Section 2: Tipos de Habitación ─────────────────────────────────────
  const [roomTypes, setRoomTypes] = useState<LocalRoomType[]>(() => {
    if (initialRoomTypes && initialRoomTypes.length > 0) {
      return initialRoomTypes.map((rt, idx) => ({
        tempId: String(idx),
        name: rt.name,
        description: rt.description ?? "",
        capacity: rt.capacity,
        has_private_bathroom: rt.has_private_bathroom,
        base_price: rt.base_price != null ? String(rt.base_price) : "",
        occupancy_pricings: rt.occupancy_pricings.map((op) => ({
          occupancy: op.occupancy,
          price: String(op.price),
        })),
        showOccupancies: rt.occupancy_pricings.length > 0,
      }));
    }
    return [];
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // ─── Section 3: Quantities ──────────────────────────────────────────────
  const [quantities, setQuantities] = useState<Quantities>(() => {
    if (initialQuantities) return { ...initialQuantities };
    return {};
  });

  // ─── Simulator ─────────────────────────────────────────────────────────
  const [showSimulator, setShowSimulator] = useState(false);

  // ─── Submit state ───────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Computed: totals ───────────────────────────────────────────────────
  const totalRooms = useMemo(() => {
    return roomTypes.reduce((sum, rt) => sum + (quantities[rt.tempId] ?? 0), 0);
  }, [roomTypes, quantities]);

  const totalCapacity = useMemo(() => {
    return roomTypes.reduce((sum, rt) => sum + rt.capacity * (quantities[rt.tempId] ?? 0), 0);
  }, [roomTypes, quantities]);

  // ─── Preview: compute total price per person for a room type ────────────
  function previewTotal(rt: LocalRoomType, occupancy?: number): number | null {
    let accommodationPerNight: number | null = null;

    if (rt.showOccupancies && occupancy != null) {
      const match = rt.occupancy_pricings.find((op) => op.occupancy === occupancy);
      if (match && match.price) accommodationPerNight = parseFloat(match.price);
    }
    if (accommodationPerNight == null && rt.base_price) {
      accommodationPerNight = parseFloat(rt.base_price);
    }
    if (accommodationPerNight == null || isNaN(accommodationPerNight)) return null;

    return computeTotalEventPrice({
      accommodationPerNight,
      nights,
      days,
      pricingMode,
      facilitationCostDay: facilitationDay ? parseFloat(facilitationDay) : null,
      managementCostDay: managementDay ? parseFloat(managementDay) : null,
    });
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  function addRoomType(rt: LocalRoomType) {
    setRoomTypes((prev) => [...prev, rt]);
    setQuantities((prev) => ({ ...prev, [rt.tempId]: 1 }));
    setShowAddForm(false);
  }

  function updateRoomType(tempId: string, updates: Partial<LocalRoomType>) {
    setRoomTypes((prev) =>
      prev.map((rt) => (rt.tempId === tempId ? { ...rt, ...updates } : rt))
    );
  }

  function deleteRoomType(tempId: string) {
    setRoomTypes((prev) => prev.filter((rt) => rt.tempId !== tempId));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[tempId];
      return next;
    });
    if (expandedId === tempId) setExpandedId(null);
  }

  async function handleNext() {
    setError(null);
    setSubmitting(true);
    try {
      const hasPricing = roomTypes.some((rt) => rt.base_price !== "");

      // 1. Save event fields
      await saveEventSetupFields(event.id, {
        location: location.trim() || null,
        event_price: null,
        deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
        pricing_by_room_type: hasPricing,
        pricing_mode: pricingMode,
        facilitation_cost_day: facilitationDay ? parseFloat(facilitationDay) : null,
        management_cost_day: managementDay ? parseFloat(managementDay) : null,
        meal_cost_breakfast: mealBreakfast ? parseFloat(mealBreakfast) : null,
        meal_cost_lunch: mealLunch ? parseFloat(mealLunch) : null,
        meal_cost_dinner: mealDinner ? parseFloat(mealDinner) : null,
      });

      // 2. Create room types + rooms
      if (roomTypes.length > 0) {
        const typeDefs = roomTypes.map((rt) => ({
          name: rt.name.trim(),
          description: rt.description.trim() || null,
          capacity: rt.capacity,
          has_private_bathroom: rt.has_private_bathroom,
          base_price: !rt.showOccupancies && rt.base_price ? parseFloat(rt.base_price) : null,
          occupancy_pricings: rt.showOccupancies
            ? rt.occupancy_pricings
                .filter((op) => op.price && !isNaN(parseFloat(op.price)))
                .map((op) => ({ occupancy: op.occupancy, price: parseFloat(op.price) }))
            : [],
        }));
        const qtys = roomTypes.map((rt) => quantities[rt.tempId] ?? 0);
        await createEventWithRoomTypes(event.id, typeDefs, qtys);
      }

      router.push(`/events/${event.id}/detail?from=wizard`);
    } catch (e) {
      if (e instanceof Error && "digest" in e) throw e;
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSubmitting(false);
    }
  }

  const canProceed = roomTypes.length > 0 && roomTypes.every((rt) => rt.name.trim() && rt.capacity >= 1);

  return (
    <div className="space-y-6">
      {/* ─── Card: Centro ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Centro</h3>
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

          {/* ─── Tipos de Habitación ──────────────────────────────────── */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              <BedDouble className="size-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700">Tipos de Habitación</h4>
              {nights > 0 && (
                <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  {nights} {nights === 1 ? "noche" : "noches"}
                </span>
              )}
            </div>

            {roomTypes.length === 0 && !showAddForm && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center">
                <p className="text-sm text-gray-400">No hay tipos de habitación</p>
                <p className="mt-1 text-xs text-gray-400">
                  Añade tipos para definir las opciones de alojamiento
                </p>
              </div>
            )}

            {roomTypes.map((rt) => (
              <RoomTypeCard
                key={rt.tempId}
                roomType={rt}
                expanded={expandedId === rt.tempId}
                onToggle={() => setExpandedId(expandedId === rt.tempId ? null : rt.tempId)}
                onUpdate={(updates) => updateRoomType(rt.tempId, updates)}
                onDelete={() => deleteRoomType(rt.tempId)}
                previewTotal={previewTotal}
                pricingMode={pricingMode}
                nights={nights}
              />
            ))}

            {showAddForm ? (
              <AddRoomTypeForm
                onAdd={addRoomType}
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

          {/* ─── Habitaciones + resumen ───────────────────────────────── */}
          {roomTypes.length > 0 && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2">
                <Hash className="size-4 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-700">Habitaciones</h4>
              </div>

              <div className="space-y-3">
                {roomTypes.map((rt) => (
                  <div key={rt.tempId} className="flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {rt.name || "Sin nombre"}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({rt.capacity} plazas)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-500">Cantidad:</Label>
                      <Input
                        type="number"
                        min={0}
                        value={quantities[rt.tempId] ?? 0}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [rt.tempId]: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="h-8 w-20 text-center text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
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
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={mealBreakfast}
                  onChange={(e) => setMealBreakfast(e.target.value)}
                  placeholder="Opcional"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Comida (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={mealLunch}
                  onChange={(e) => setMealLunch(e.target.value)}
                  placeholder="Opcional"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cena (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={mealDinner}
                  onChange={(e) => setMealDinner(e.target.value)}
                  placeholder="Opcional"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Card: Gestión ─────────────────────────────────────────────── */}
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
                <input
                  type="radio"
                  name="pricing_mode"
                  value="direct"
                  checked={pricingMode === "direct"}
                  onChange={() => setPricingMode("direct")}
                  className="accent-primary"
                />
                Precio Final
              </label>
              <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${pricingMode === "breakdown" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-600"}`}>
                <input
                  type="radio"
                  name="pricing_mode"
                  value="breakdown"
                  checked={pricingMode === "breakdown"}
                  onChange={() => setPricingMode("breakdown")}
                  className="accent-primary"
                />
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Facilitación/día (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={facilitationDay}
                    onChange={(e) => setFacilitationDay(e.target.value)}
                    placeholder="€/pers./día"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gestión/día (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={managementDay}
                    onChange={(e) => setManagementDay(e.target.value)}
                    placeholder="€/pers./día"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Deposit */}
          <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* ─── Cost Simulator Modal ──────────────────────────────────────── */}
      <CostSimulatorModal
        open={showSimulator}
        onOpenChange={setShowSimulator}
        roomTypes={roomTypes.map((rt) => ({
          name: rt.name,
          base_price: rt.base_price ? parseFloat(rt.base_price) : null,
          occupancy_pricings: rt.occupancy_pricings
            .filter((op) => op.price && !isNaN(parseFloat(op.price)))
            .map((op) => ({ occupancy: op.occupancy, price: parseFloat(op.price) })),
        }))}
        nights={nights}
        days={days}
        estimatedParticipants={event.estimated_participants}
        facilitationCostDay={facilitationDay ? parseFloat(facilitationDay) : null}
        onApply={(value) => setManagementDay(value.toFixed(2))}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ─── Navigation ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Link>
        <Button onClick={handleNext} disabled={submitting || !canProceed}>
          {submitting ? "Guardando..." : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}

// ─── RoomTypeCard ─────────────────────────────────────────────────────────

function RoomTypeCard({
  roomType,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  previewTotal,
  pricingMode,
  nights,
}: {
  roomType: LocalRoomType;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<LocalRoomType>) => void;
  onDelete: () => void;
  previewTotal: (rt: LocalRoomType, occupancy?: number) => number | null;
  pricingMode: string;
  nights: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalDirect = previewTotal(roomType);
  const hasOccPrices = roomType.showOccupancies && roomType.occupancy_pricings.some((op) => op.price);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={onToggle}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{roomType.name || "Sin nombre"}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {roomType.capacity} plazas
            </span>
            {roomType.has_private_bathroom && (
              <Bath className="size-3.5 text-blue-500" />
            )}
          </div>
          {/* Preview line */}
          {totalDirect != null && (
            <p className="mt-0.5 text-xs text-gray-500">
              {hasOccPrices
                ? roomType.occupancy_pricings
                    .filter((op) => op.price)
                    .map((op) => {
                      const t = previewTotal(roomType, op.occupancy);
                      return t != null ? `${occupancyLabel(op.occupancy)}: ${t.toFixed(0)}€` : null;
                    })
                    .filter(Boolean)
                    .join(" · ")
                : `${totalDirect.toFixed(0)}€ total (${nights}n)`}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-gray-400" />
        ) : (
          <ChevronDown className="size-4 text-gray-400" />
        )}
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={roomType.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Capacidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={roomType.capacity}
                  onChange={(e) => {
                    const cap = parseInt(e.target.value) || 1;
                    onUpdate({ capacity: cap });
                    // Update occupancy rows if needed
                    if (roomType.showOccupancies) {
                      const newRows: OccupancyRow[] = [];
                      for (let i = 1; i <= Math.min(cap, 4); i++) {
                        const existing = roomType.occupancy_pricings.find((op) => op.occupancy === i);
                        newRows.push({ occupancy: i, price: existing?.price ?? "" });
                      }
                      onUpdate({ capacity: cap, occupancy_pricings: newRows });
                    }
                  }}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <textarea
                value={roomType.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Descripción opcional..."
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roomType.has_private_bathroom}
                onChange={(e) => onUpdate({ has_private_bathroom: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Bath className="size-3.5 text-blue-500" />
              Baño privado
            </label>

            {/* Pricing mode: single vs occupancy */}
            <div className="space-y-2">
              <Label className="text-xs">
                Precio (€/persona/noche)
                {pricingMode === "breakdown" && (
                  <span className="ml-1 font-normal text-gray-400">— solo alojamiento</span>
                )}
              </Label>
              <div className="flex gap-2">
                <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${!roomType.showOccupancies ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500"}`}>
                  <input type="radio" checked={!roomType.showOccupancies} onChange={() => onUpdate({ showOccupancies: false })} className="accent-primary" />
                  Precio único
                </label>
                <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${roomType.showOccupancies ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500"}`}>
                  <input type="radio" checked={roomType.showOccupancies} onChange={() => {
                    const rows: OccupancyRow[] = roomType.occupancy_pricings.length > 0
                      ? roomType.occupancy_pricings
                      : Array.from({ length: Math.min(roomType.capacity, 4) }, (_, i) => ({ occupancy: i + 1, price: "" }));
                    onUpdate({ showOccupancies: true, base_price: "", occupancy_pricings: rows });
                  }} className="accent-primary" />
                  Por ocupación
                </label>
              </div>
              {!roomType.showOccupancies ? (
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={roomType.base_price}
                  onChange={(e) => onUpdate({ base_price: e.target.value })}
                  placeholder="€ por persona y noche"
                  className="h-8 w-40 text-sm"
                />
              ) : (
                <div className="space-y-2">
                  {roomType.occupancy_pricings.map((o, idx) => {
                    const total = previewTotal(roomType, o.occupancy);
                    return (
                      <div key={o.occupancy} className="flex items-center gap-2">
                        <span className="w-24 text-xs text-gray-600">{occupancyLabel(o.occupancy)}</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={o.price}
                          onChange={(e) => {
                            const next = [...roomType.occupancy_pricings];
                            next[idx] = { ...o, price: e.target.value };
                            onUpdate({ occupancy_pricings: next });
                          }}
                          placeholder="€/pers/noche"
                          className="h-7 w-28 text-xs"
                        />
                        {total != null && o.price && (
                          <span className="text-xs text-gray-400">= {total.toFixed(0)}€ total</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">¿Eliminar tipo?</span>
                  <Button size="sm" variant="destructive" onClick={onDelete}>
                    Sí
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
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
        </div>
      )}
    </div>
  );
}

// ─── AddRoomTypeForm ──────────────────────────────────────────────────────

function AddRoomTypeForm({
  onAdd,
  onCancel,
}: {
  onAdd: (rt: LocalRoomType) => void;
  onCancel: () => void;
}) {
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

    onAdd({
      tempId: generateId(),
      name: name.trim(),
      description: description.trim(),
      capacity: cap,
      has_private_bathroom: bathroom,
      base_price: basePrice,
      occupancy_pricings: showOccupancies ? occupancies : [],
      showOccupancies,
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
              onChange={(e) => {
                setCapacity(e.target.value);
                if (showOccupancies) {
                  const cap = parseInt(e.target.value) || 2;
                  const rows: OccupancyRow[] = [];
                  for (let i = 1; i <= Math.min(cap, 4); i++) {
                    const existing = occupancies.find((o) => o.occupancy === i);
                    rows.push({ occupancy: i, price: existing?.price ?? "" });
                  }
                  setOccupancies(rows);
                }
              }}
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
              {occupancies.map((o, idx) => (
                <div key={o.occupancy} className="flex items-center gap-2">
                  <span className="w-24 text-xs text-gray-600">{occupancyLabel(o.occupancy)}</span>
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
          <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>
            <Plus className="mr-1 size-3.5" />
            Añadir
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
