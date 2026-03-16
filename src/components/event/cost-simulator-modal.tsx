"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RoomTypeOption {
  name: string;
  base_price: number | null;
  occupancy_pricings: { occupancy: number; price: number }[];
}

interface CostSimulatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomTypes: RoomTypeOption[];
  nights: number;
  days: number;
  estimatedParticipants: number;
  facilitationCostDay: number | null;
  onApply: (managementCostDay: number) => void;
}

function getRoomTypePrice(rt: RoomTypeOption): number | null {
  const occ1 = rt.occupancy_pricings.find((op) => op.occupancy === 1);
  if (occ1) return occ1.price;
  return rt.base_price;
}

type FeeMode = "total" | "per_person_day";

export function CostSimulatorModal({
  open,
  onOpenChange,
  roomTypes,
  nights,
  days,
  estimatedParticipants,
  facilitationCostDay,
  onApply,
}: CostSimulatorModalProps) {
  const [participants, setParticipants] = useState(String(estimatedParticipants));
  const [numFacilitators, setNumFacilitators] = useState("");
  const [selectedRoomTypeIdx, setSelectedRoomTypeIdx] = useState<string>("");
  const [feeMode, setFeeMode] = useState<FeeMode>(
    facilitationCostDay != null && facilitationCostDay > 0 ? "per_person_day" : "total"
  );
  const [feeTotal, setFeeTotal] = useState("");
  const [feePerPersonDay, setFeePerPersonDay] = useState(
    facilitationCostDay != null && facilitationCostDay > 0 ? String(facilitationCostDay) : ""
  );
  const [extraCosts, setExtraCosts] = useState("");

  const parsedParticipants = parseInt(participants) || 0;
  const parsedFacilitators = parseInt(numFacilitators) || 0;
  const parsedExtra = parseFloat(extraCosts) || 0;

  const hasFacilitationSet = facilitationCostDay != null && facilitationCostDay > 0;

  const selectedRoomType = selectedRoomTypeIdx !== "" ? roomTypes[parseInt(selectedRoomTypeIdx)] : null;
  const roomTypePrice = selectedRoomType ? getRoomTypePrice(selectedRoomType) : null;

  const breakdown = useMemo(() => {
    const accommodationFacilitators = (roomTypePrice ?? 0) * nights * parsedFacilitators;

    // Facilitation total depends on input mode
    const parsedFeeTotal = parseFloat(feeTotal) || 0;
    const parsedFeePerDay = parseFloat(feePerPersonDay) || 0;
    const facilitationTotal = feeMode === "total"
      ? parsedFeeTotal
      : parsedFeePerDay * parsedParticipants * days;

    // If facilitation/day is already set in the parent form AND user kept per_person_day mode
    // with the same value, facilitation is already charged to participants
    const facilitationAlreadyCovered = hasFacilitationSet && feeMode === "per_person_day"
      && parsedFeePerDay === facilitationCostDay;

    const totalForManagement = facilitationAlreadyCovered
      ? accommodationFacilitators + parsedExtra
      : facilitationTotal + accommodationFacilitators + parsedExtra;

    const managementPerPersonDay =
      parsedParticipants > 0 && days > 0
        ? totalForManagement / (parsedParticipants * days)
        : 0;

    return {
      facilitationTotal,
      facilitationAlreadyCovered,
      accommodationFacilitators,
      totalForManagement,
      managementPerPersonDay,
    };
  }, [roomTypePrice, nights, parsedFacilitators, feeTotal, feePerPersonDay, feeMode, parsedExtra, parsedParticipants, days, hasFacilitationSet, facilitationCostDay]);

  const canApply = parsedParticipants > 0 && days > 0;

  function handleApply() {
    onApply(breakdown.managementPerPersonDay);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Simulador de costes de gestión</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inputs */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Participantes estimados</Label>
                <Input
                  type="number"
                  min={0}
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nº de facilitadores</Label>
                <Input
                  type="number"
                  min={0}
                  value={numFacilitators}
                  onChange={(e) => setNumFacilitators(e.target.value)}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tipo de habitación para facilitadores</Label>
              <select
                value={selectedRoomTypeIdx}
                onChange={(e) => setSelectedRoomTypeIdx(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Sin alojamiento —</option>
                {roomTypes.map((rt, idx) => {
                  const price = getRoomTypePrice(rt);
                  return (
                    <option key={idx} value={String(idx)}>
                      {rt.name}{price != null ? ` (${price}€/noche)` : " (sin precio)"}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Facilitation fees: total or per person/day */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Gastos de facilitación</Label>
                <div className="ml-auto flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFeeMode("total")}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${feeMode === "total" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}
                  >
                    Total
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeMode("per_person_day")}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${feeMode === "per_person_day" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}
                  >
                    €/pers./día
                  </button>
                </div>
              </div>
              {feeMode === "total" ? (
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={feeTotal}
                  onChange={(e) => setFeeTotal(e.target.value)}
                  placeholder="Importe total del evento"
                  className="text-sm"
                />
              ) : (
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={feePerPersonDay}
                  onChange={(e) => setFeePerPersonDay(e.target.value)}
                  placeholder="€/pers./día"
                  className="text-sm"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Gastos extra del centro (€)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={extraCosts}
                onChange={(e) => setExtraCosts(e.target.value)}
                placeholder="Alquiler de salas, recursos..."
                className="text-sm"
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Desglose</p>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>
                  Facilitación
                  {feeMode === "per_person_day"
                    ? ` (${feePerPersonDay || "0"}€ × ${parsedParticipants} pers. × ${days}d)`
                    : ""}
                  {breakdown.facilitationAlreadyCovered && (
                    <span className="ml-1 text-emerald-600">✓ ya incluido</span>
                  )}
                </span>
                <span className={`font-medium ${breakdown.facilitationAlreadyCovered ? "text-gray-400 line-through" : "text-gray-700"}`}>
                  {breakdown.facilitationTotal.toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between">
                <span>Alojamiento facilitadores ({parsedFacilitators} × {roomTypePrice ?? 0}€ × {nights}n)</span>
                <span className="font-medium text-gray-700">{breakdown.accommodationFacilitators.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span>Gastos extra centro</span>
                <span className="font-medium text-gray-700">{parsedExtra.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span className="font-medium text-gray-700">Total a repartir en gestión</span>
                <span className="font-medium text-gray-700">{breakdown.totalForManagement.toFixed(2)}€</span>
              </div>
              <div className="mt-0.5 text-[10px] text-gray-400">
                ÷ {parsedParticipants} participantes × {days} días
              </div>
            </div>

            {/* Result */}
            <div className="mt-2 flex items-center justify-between rounded-md bg-primary/10 px-3 py-2">
              <span className="text-sm font-medium text-gray-700">Gestión/persona/día</span>
              <span className="text-lg font-bold text-primary">
                {breakdown.managementPerPersonDay.toFixed(2)}€
              </span>
            </div>
          </div>

          <Button onClick={handleApply} disabled={!canApply} className="w-full">
            Aplicar {breakdown.managementPerPersonDay.toFixed(2)} €/pers./día
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
