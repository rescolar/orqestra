"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveEventSetupFields, createRoomsFromTypesOnly } from "@/lib/actions/event";
import { RoomSetupForm } from "@/components/room-setup-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

type RoomTypeData = {
  capacity: number;
  hasPrivateBathroom: boolean;
  quantity: number;
  price?: number;
  dailyRate?: number;
};

interface SetupStepClientProps {
  event: {
    id: string;
    name: string;
    estimated_participants: number;
    location: string | null;
    event_price: number | null;
    deposit_amount: number | null;
    pricing_by_room_type: boolean;
    meal_cost_breakfast: number | null;
    meal_cost_lunch: number | null;
    meal_cost_dinner: number | null;
  };
  hasExistingRooms: boolean;
}

export function SetupStepClient({ event, hasExistingRooms }: SetupStepClientProps) {
  const router = useRouter();
  const [location, setLocation] = useState(event.location ?? "");
  const [eventPrice, setEventPrice] = useState(event.event_price != null ? String(event.event_price) : "");
  const [depositAmount, setDepositAmount] = useState(event.deposit_amount != null ? String(event.deposit_amount) : "");
  const [pricingByRoomType, setPricingByRoomType] = useState(event.pricing_by_room_type);
  const [mealBreakfast, setMealBreakfast] = useState(event.meal_cost_breakfast != null ? String(event.meal_cost_breakfast) : "");
  const [mealLunch, setMealLunch] = useState(event.meal_cost_lunch != null ? String(event.meal_cost_lunch) : "");
  const [mealDinner, setMealDinner] = useState(event.meal_cost_dinner != null ? String(event.meal_cost_dinner) : "");
  const [roomTypes, setRoomTypes] = useState<RoomTypeData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    setError(null);
    setSubmitting(true);
    try {
      // Save setup fields
      await saveEventSetupFields(event.id, {
        location: location.trim() || null,
        event_price: eventPrice ? parseFloat(eventPrice) : null,
        deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
        pricing_by_room_type: pricingByRoomType,
        meal_cost_breakfast: mealBreakfast ? parseFloat(mealBreakfast) : null,
        meal_cost_lunch: mealLunch ? parseFloat(mealLunch) : null,
        meal_cost_dinner: mealDinner ? parseFloat(mealDinner) : null,
      });

      // Create rooms if there are types and no existing rooms
      if (!hasExistingRooms && roomTypes.length > 0) {
        await createRoomsFromTypesOnly(event.id, roomTypes, pricingByRoomType);
      }

      router.push(`/events/${event.id}/detail?from=wizard`);
    } catch (e) {
      if (e instanceof Error && "digest" in e) throw e;
      setError(e instanceof Error ? e.message : "Error al guardar");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Location */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Ubicación</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Dirección o nombre del centro</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Casa de retiro, dirección..."
            />
          </div>
        </div>
      </div>

      {/* Room setup — hidden if venue already copied rooms */}
      {!hasExistingRooms && (
        <RoomSetupForm
          eventId={event.id}
          estimatedParticipants={event.estimated_participants}
          hideNavigation
          onTypesChange={(types, pricing) => {
            setRoomTypes(types);
            setPricingByRoomType(pricing);
          }}
          onPricingChange={(enabled) => setPricingByRoomType(enabled)}
        />
      )}

      {/* Pricing */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Precio del evento</h3>
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
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Precio definido por tipo de habitación. Solo configura la reserva aquí.
              </p>
              <div className="max-w-[200px] space-y-2">
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Atrás
        </Link>
        <Button onClick={handleNext} disabled={submitting || (!hasExistingRooms && roomTypes.length === 0)}>
          {submitting ? "Guardando..." : "Siguiente"}
        </Button>
      </div>
    </div>
  );
}
