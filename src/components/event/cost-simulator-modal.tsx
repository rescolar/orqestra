"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonFormDialog } from "@/components/person/person-form-dialog";
import { saveEventCostManager } from "@/lib/actions/economics";
import { upsertFacilitatorFromSimulator } from "@/lib/actions/person";
import type { CostManagerData } from "@/lib/services/economics.service";

interface RoomTypeOption {
  id?: string;
  name: string;
  base_price: number | null;
  occupancy_pricings: { occupancy: number; price: number }[];
}

interface OrganizerPersonOption {
  id: string;
  name_full: string;
  name_display: string;
  name_initials: string;
  gender: "unknown" | "female" | "male" | "other";
  default_role: "participant" | "facilitator";
  event_persons: {
    id: string;
    role: "participant" | "facilitator";
    room: {
      display_name: string | null;
      internal_number: string;
    } | null;
  }[];
}

interface CostSimulatorModalProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizerPersons: OrganizerPersonOption[];
  initialData: CostManagerData | null;
  roomTypes: RoomTypeOption[];
  nights: number;
  days: number;
  estimatedParticipants: number;
  facilitationCostDay: number | null;
  onApply: (managementCostDay: number) => void;
}

type FacilitatorFeeMode = "total" | "per_person";

interface FacilitatorConfig {
  personId: string | null;
  personQuery: string;
  personName: string;
  eventPersonId: string | null;
  roomTypeIdx: string;
  nights: string;
  feeMode: FacilitatorFeeMode;
  feeAmount: string;
  statusMessage: string | null;
  errorMessage: string | null;
}

interface ExtraCostItem {
  id: string;
  title: string;
  cost: string;
}

function getRoomTypePrice(rt: RoomTypeOption): number | null {
  const occ1 = rt.occupancy_pricings.find((op) => op.occupancy === 1);
  if (occ1) return occ1.price;
  return rt.base_price;
}

function createFacilitatorConfig(defaultNights: number, feeMode: FacilitatorFeeMode): FacilitatorConfig {
  return {
    personId: null,
    personQuery: "",
    personName: "",
    eventPersonId: null,
    roomTypeIdx: "",
    nights: String(defaultNights),
    feeMode,
    feeAmount: "",
    statusMessage: null,
    errorMessage: null,
  };
}

function createExtraCostItem(id: number): ExtraCostItem {
  return {
    id: `extra-cost-${id}`,
    title: "",
    cost: "",
  };
}

export function CostSimulatorModal({
  eventId,
  open,
  onOpenChange,
  organizerPersons,
  initialData,
  roomTypes,
  nights,
  days,
  estimatedParticipants,
  facilitationCostDay,
  onApply,
}: CostSimulatorModalProps) {
  const [participants, setParticipants] = useState(String(estimatedParticipants));
  const initialFeeMode: FacilitatorFeeMode =
    facilitationCostDay != null && facilitationCostDay > 0 ? "per_person" : "total";
  const [facilitators, setFacilitators] = useState<FacilitatorConfig[]>([
    createFacilitatorConfig(nights, initialFeeMode),
  ]);
  const [personOptions, setPersonOptions] = useState(organizerPersons);
  const [extraCostItems, setExtraCostItems] = useState<ExtraCostItem[]>([
    createExtraCostItem(1),
  ]);
  const [organizationProfit, setOrganizationProfit] = useState("");
  const [createFacilitatorIndex, setCreateFacilitatorIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeFacilitatorIndex, setActiveFacilitatorIndex] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [persistedData, setPersistedData] = useState<CostManagerData | null>(initialData);

  const parsedParticipants = parseInt(participants) || 0;
  const parsedOrganizationProfit = parseFloat(organizationProfit) || 0;
  const hasFacilitationSet = facilitationCostDay != null && facilitationCostDay > 0;

  const breakdown = useMemo(() => {
    const facilitatorRows = facilitators.map((facilitator, index) => {
      const selectedRoomType =
        facilitator.roomTypeIdx !== "" ? roomTypes[parseInt(facilitator.roomTypeIdx)] : null;
      const roomPrice = selectedRoomType ? (getRoomTypePrice(selectedRoomType) ?? 0) : 0;
      const facilitatorNights = parseInt(facilitator.nights) || 0;
      const feeAmount = parseFloat(facilitator.feeAmount) || 0;
      const accommodationTotal = roomPrice * facilitatorNights;
      const feeTotal =
        facilitator.feeMode === "per_person"
          ? feeAmount * parsedParticipants
          : feeAmount;
      const facilitationAlreadyCovered =
        hasFacilitationSet &&
        facilitator.feeMode === "per_person" &&
        feeAmount === facilitationCostDay;

      return {
        id: index,
        roomName: selectedRoomType?.name ?? "Sin alojamiento",
        roomPrice,
        nights: facilitatorNights,
        feeAmount,
        accommodationTotal,
        feeTotal,
        facilitationAlreadyCovered,
        subtotal:
          accommodationTotal + (facilitationAlreadyCovered ? 0 : feeTotal),
      };
    });

    const extraRows = extraCostItems.map((item) => ({
      ...item,
      parsedCost: parseFloat(item.cost) || 0,
    }));

    const facilitationTotal = facilitatorRows.reduce((sum, row) => sum + row.feeTotal, 0);
    const accommodationFacilitators = facilitatorRows.reduce(
      (sum, row) => sum + row.accommodationTotal,
      0
    );
    const facilitationCoveredTotal = facilitatorRows.reduce(
      (sum, row) => sum + (row.facilitationAlreadyCovered ? row.feeTotal : 0),
      0
    );
    const extraCostsTotal = extraRows.reduce((sum, row) => sum + row.parsedCost, 0);
    const totalForManagement =
      facilitationTotal -
      facilitationCoveredTotal +
      accommodationFacilitators +
      extraCostsTotal +
      parsedOrganizationProfit;
    const managementPerPersonDay =
      parsedParticipants > 0 && days > 0
        ? totalForManagement / (parsedParticipants * days)
        : 0;

    return {
      facilitatorRows,
      extraRows,
      facilitationTotal,
      accommodationFacilitators,
      extraCostsTotal,
      totalForManagement,
      managementPerPersonDay,
    };
  }, [
    facilitators,
    roomTypes,
    parsedParticipants,
    hasFacilitationSet,
    facilitationCostDay,
    extraCostItems,
    parsedOrganizationProfit,
    days,
  ]);

  const canApply = parsedParticipants > 0 && days > 0;

  useEffect(() => {
    setPersistedData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!open) return;

    if (!persistedData) {
      setFacilitators([createFacilitatorConfig(nights, initialFeeMode)]);
      setExtraCostItems([createExtraCostItem(1)]);
      setOrganizationProfit("");
      setSaveMessage(null);
      return;
    }

    const mappedFacilitators = persistedData.facilitators.length > 0
      ? persistedData.facilitators.map((facilitator) => {
          const roomTypeIndex = roomTypes.findIndex((roomType) => {
            if (facilitator.roomTypeId && roomType.id) {
              return roomType.id === facilitator.roomTypeId;
            }
            if (facilitator.roomTypeName) {
              return roomType.name === facilitator.roomTypeName;
            }
            return false;
          });

          return {
            personId: facilitator.personId,
            personQuery: facilitator.personName,
            personName: facilitator.personName,
            eventPersonId: facilitator.eventPersonId,
            roomTypeIdx: roomTypeIndex >= 0 ? String(roomTypeIndex) : "",
            nights: String(facilitator.nights || nights),
            feeMode: facilitator.feeMode,
            feeAmount: facilitator.feeAmount > 0 ? String(facilitator.feeAmount) : "",
            statusMessage: null,
            errorMessage: null,
          };
        })
      : [createFacilitatorConfig(nights, initialFeeMode)];

    setFacilitators(mappedFacilitators);
    setExtraCostItems(
      persistedData.extraCosts.length > 0
        ? persistedData.extraCosts.map((item, index) => ({
            id: `extra-cost-${index + 1}`,
            title: item.title,
            cost: String(item.cost),
          }))
        : [createExtraCostItem(1)]
    );
    setOrganizationProfit(
      persistedData.organizationProfit > 0 ? String(persistedData.organizationProfit) : ""
    );
    setSaveMessage(null);
  }, [open, persistedData, roomTypes, nights, initialFeeMode]);

  function updateFacilitator(index: number, patch: Partial<FacilitatorConfig>) {
    setFacilitators((current) =>
      current.map((facilitator, facilitatorIndex) =>
        facilitatorIndex === index ? { ...facilitator, ...patch } : facilitator
      )
    );
  }

  function addFacilitator() {
    setFacilitators((current) => [
      ...current,
      createFacilitatorConfig(nights, initialFeeMode),
    ]);
  }

  function removeFacilitator(index: number) {
    setFacilitators((current) =>
      current.length === 1 ? current : current.filter((_, facilitatorIndex) => facilitatorIndex !== index)
    );
  }

  function updateExtraCost(id: string, patch: Partial<ExtraCostItem>) {
    setExtraCostItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addExtraCost() {
    setExtraCostItems((current) => [...current, createExtraCostItem(current.length + 1)]);
  }

  function removeExtraCost(id: string) {
    setExtraCostItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id)
    );
  }

  function ensurePersonOption(person: OrganizerPersonOption) {
    setPersonOptions((current) => {
      const exists = current.some((item) => item.id === person.id);
      if (exists) {
        return current.map((item) => (item.id === person.id ? person : item));
      }
      return [...current, person].sort((a, b) => a.name_full.localeCompare(b.name_full));
    });
  }

  function roomTypeIdForFacilitator(facilitator: FacilitatorConfig): string | null | undefined {
    if (facilitator.roomTypeIdx === "") return undefined;
    const selectedRoomType = roomTypes[parseInt(facilitator.roomTypeIdx)];
    return selectedRoomType?.id ?? null;
  }

  function syncFacilitator(
    index: number,
    payload: {
      personId?: string;
      createPerson?: {
        name_full: string;
        gender: "unknown" | "female" | "male" | "other";
        contact_email?: string | null;
        contact_phone?: string | null;
        dietary_requirements?: string[];
        allergies_text?: string | null;
      };
      facilitatorOverride?: FacilitatorConfig;
    }
  ) {
    const facilitator = payload.facilitatorOverride ?? facilitators[index];
    if (!facilitator) return;

    const roomTypeId = roomTypeIdForFacilitator(facilitator);
    setActiveFacilitatorIndex(index);
    updateFacilitator(index, {
      errorMessage: null,
      statusMessage: payload.personId
        ? `Configurando ${facilitator.personName || facilitator.personQuery || "facilitador"} como facilitador...`
        : "Creando y configurando facilitador...",
    });

    startTransition(async () => {
      try {
        const result = await upsertFacilitatorFromSimulator(
          eventId,
          payload.personId
            ? { personId: payload.personId, roomTypeId }
            : { createPerson: payload.createPerson!, roomTypeId }
        );

        const selectedPerson = personOptions.find((person) => person.id === result.personId);
        if (selectedPerson) {
          ensurePersonOption({
            ...selectedPerson,
            default_role: "facilitator",
            event_persons: [
              {
                id: result.eventPersonId,
                role: "facilitator",
                room: result.roomLabel
                  ? { display_name: result.roomLabel, internal_number: "" }
                  : null,
              },
            ],
          });
        } else {
          ensurePersonOption({
            id: result.personId,
            name_full: result.personName,
            name_display: result.personName,
            name_initials: result.personName
              .split(" ")
              .map((part) => part[0] ?? "")
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            gender: payload.createPerson?.gender ?? "unknown",
            default_role: "facilitator",
            event_persons: [
              {
                id: result.eventPersonId,
                role: "facilitator",
                room: result.roomLabel
                  ? { display_name: result.roomLabel, internal_number: "" }
                  : null,
              },
            ],
          });
        }

        updateFacilitator(index, {
          personId: result.personId,
          personName: result.personName,
          personQuery: result.personName,
          eventPersonId: result.eventPersonId,
          statusMessage: result.roomLabel
            ? `Facilitador asignado a ${result.roomLabel}`
            : "Facilitador añadido al evento",
          errorMessage: null,
        });
      } catch (error) {
        updateFacilitator(index, {
          errorMessage: error instanceof Error ? error.message : "No se pudo guardar el facilitador",
          statusMessage: null,
        });
      } finally {
        setActiveFacilitatorIndex(null);
      }
    });
  }

  function handlePersonSelect(index: number, person: OrganizerPersonOption) {
    updateFacilitator(index, {
      personId: person.id,
      personName: person.name_full,
      personQuery: person.name_full,
      errorMessage: null,
    });
    syncFacilitator(index, { personId: person.id });
  }

  function handleRoomTypeChange(index: number, roomTypeIdx: string) {
    const currentFacilitator = facilitators[index];
    if (!currentFacilitator) return;

    const nextFacilitator = {
      ...currentFacilitator,
      roomTypeIdx,
      errorMessage: null,
      statusMessage: currentFacilitator.statusMessage ?? null,
    };

    updateFacilitator(index, nextFacilitator);

    const personId = currentFacilitator.personId;
    if (!personId) return;

    setTimeout(() => {
      syncFacilitator(index, {
        personId,
        facilitatorOverride: nextFacilitator,
      });
    }, 0);
  }

  function handleApply() {
    setSaveMessage(null);
    startTransition(async () => {
      try {
        const result = await saveEventCostManager(eventId, {
          participants: parsedParticipants,
          days,
          organizationProfit: parsedOrganizationProfit,
          facilitators: facilitators
            .filter((facilitator) => facilitator.eventPersonId && facilitator.personId)
            .map((facilitator) => {
              const selectedRoomType =
                facilitator.roomTypeIdx !== ""
                  ? roomTypes[parseInt(facilitator.roomTypeIdx)]
                  : null;
              const roomPrice = selectedRoomType ? getRoomTypePrice(selectedRoomType) : null;

              return {
                eventPersonId: facilitator.eventPersonId!,
                personId: facilitator.personId!,
                personName: facilitator.personName,
                roomTypeId: selectedRoomType?.id ?? null,
                roomTypeName: selectedRoomType?.name ?? null,
                roomPrice: roomPrice ?? null,
                nights: parseInt(facilitator.nights) || 0,
                feeMode: facilitator.feeMode,
                feeAmount: parseFloat(facilitator.feeAmount) || 0,
              };
            }),
          extraCosts: extraCostItems.map((item) => ({
            title: item.title,
            cost: parseFloat(item.cost) || 0,
          })),
        });

        onApply(result.managementPerPersonDay);
        setPersistedData({
          organizationProfit: parsedOrganizationProfit,
          facilitators: facilitators
            .filter((facilitator) => facilitator.eventPersonId && facilitator.personId)
            .map((facilitator) => {
              const selectedRoomType =
                facilitator.roomTypeIdx !== ""
                  ? roomTypes[parseInt(facilitator.roomTypeIdx)]
                  : null;

              return {
                eventPersonId: facilitator.eventPersonId!,
                personId: facilitator.personId!,
                personName: facilitator.personName,
                roomTypeId: selectedRoomType?.id ?? null,
                roomTypeName: selectedRoomType?.name ?? null,
                nights: parseInt(facilitator.nights) || 0,
                feeMode: facilitator.feeMode,
                feeAmount: parseFloat(facilitator.feeAmount) || 0,
              };
            }),
          extraCosts: extraCostItems
            .map((item) => ({
              title: item.title.trim(),
              cost: parseFloat(item.cost) || 0,
            }))
            .filter((item) => item.title || item.cost > 0),
          totalPlannedCost: result.totalPlannedCost,
          managementPerPersonDay: result.managementPerPersonDay,
        });
        setSaveMessage("Costes previstos guardados");
        onOpenChange(false);
      } catch (error) {
        setSaveMessage(error instanceof Error ? error.message : "No se pudieron guardar los costes");
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gestor de costes previstos</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
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
                <Label className="text-xs">Beneficio organizacion (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={organizationProfit}
                  onChange={(e) => setOrganizationProfit(e.target.value)}
                  placeholder="Margen para la organizacion"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Facilitadores</p>
                  <p className="text-xs text-gray-500">
                    Vincula costes previstos del evento y de cada facilitador para el informe economico.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addFacilitator}>
                  Anadir facilitador
                </Button>
              </div>

              <div className="space-y-3">
                {facilitators.map((facilitator, index) => {
                  const selectedRoomType =
                    facilitator.roomTypeIdx !== ""
                      ? roomTypes[parseInt(facilitator.roomTypeIdx)]
                      : null;
                  const selectedRoomPrice = selectedRoomType ? getRoomTypePrice(selectedRoomType) : null;
                  const rowBreakdown = breakdown.facilitatorRows[index];
                  const normalizedQuery = facilitator.personQuery.trim().toLowerCase();
                  const selectedIds = facilitators
                    .map((item, itemIndex) => (itemIndex === index ? null : item.personId))
                    .filter(Boolean);
                  const filteredPersons =
                    normalizedQuery.length === 0
                      ? []
                      : personOptions
                          .filter((person) => !selectedIds.includes(person.id))
                          .filter((person) => {
                            const byName = person.name_full.toLowerCase().includes(normalizedQuery);
                            const byDisplay = person.name_display.toLowerCase().includes(normalizedQuery);
                            return byName || byDisplay;
                          })
                          .slice(0, 6);

                  const cardTitle = facilitator.personName || facilitator.personQuery.trim() || `Facilitador ${index + 1}`;

                  return (
                    <div key={`facilitator-${index}`} className="space-y-3 rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-800">
                          {cardTitle}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFacilitator(index)}
                          disabled={facilitators.length === 1 || isPending}
                          className="text-xs text-gray-500"
                        >
                          Eliminar
                        </Button>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.8fr)_120px_minmax(0,1.3fr)]">
                        <div className="space-y-1">
                          <Label className="text-xs">Persona facilitadora</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
                              <Input
                                value={facilitator.personQuery}
                                onChange={(e) =>
                                  updateFacilitator(index, {
                                    personQuery: e.target.value,
                                    personId:
                                      e.target.value === facilitator.personName
                                        ? facilitator.personId
                                        : null,
                                    errorMessage: null,
                                  })
                                }
                                placeholder="Buscar persona..."
                                className="pl-9 text-sm"
                              />
                              {filteredPersons.length > 0 &&
                                facilitator.personQuery.trim() !== facilitator.personName && (
                                  <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                                    {filteredPersons.map((person) => (
                                      <button
                                        key={person.id}
                                        type="button"
                                        onClick={() => handlePersonSelect(index, person)}
                                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                                      >
                                        <span className="font-medium text-gray-800">
                                          {person.name_full}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {person.event_persons[0]?.role === "facilitator"
                                            ? "Ya es facilitador"
                                            : person.event_persons.length > 0
                                              ? "En el evento"
                                              : person.default_role === "facilitator"
                                                ? "Directorio"
                                                : "Participante"}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => setCreateFacilitatorIndex(index)}
                              disabled={isPending}
                              aria-label="Crear facilitador"
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                          {facilitator.statusMessage && (
                            <p className="text-xs text-emerald-600">{facilitator.statusMessage}</p>
                          )}
                          {facilitator.errorMessage && (
                            <p className="text-xs text-red-600">{facilitator.errorMessage}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Tipo de habitacion</Label>
                          <select
                            value={facilitator.roomTypeIdx}
                            onChange={(e) => handleRoomTypeChange(index, e.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">Sin alojamiento</option>
                            {roomTypes.map((rt, roomTypeIndex) => {
                              const price = getRoomTypePrice(rt);
                              return (
                                <option key={`${rt.name}-${roomTypeIndex}`} value={String(roomTypeIndex)}>
                                  {rt.name}
                                  {price != null ? ` (${price}€/noche)` : " (sin precio)"}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Noches</Label>
                          <Input
                            type="number"
                            min={0}
                            value={facilitator.nights}
                            onChange={(e) => updateFacilitator(index, { nights: e.target.value })}
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Honorarios</Label>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={facilitator.feeAmount}
                            onChange={(e) => updateFacilitator(index, { feeAmount: e.target.value })}
                            placeholder={facilitator.feeMode === "per_person" ? "€ por participante" : "Importe total"}
                            className="text-sm"
                          />
                          <div className="flex gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => updateFacilitator(index, { feeMode: "total" })}
                              className={`rounded px-2 py-0.5 text-[10px] font-medium ${facilitator.feeMode === "total" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}
                            >
                              Total
                            </button>
                            <button
                              type="button"
                              onClick={() => updateFacilitator(index, { feeMode: "per_person" })}
                              className={`rounded px-2 py-0.5 text-[10px] font-medium ${facilitator.feeMode === "per_person" ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}
                            >
                              Por persona
                            </button>
                          </div>
                        </div>
                      </div>

                      {activeFacilitatorIndex === index && (
                        <p className="text-xs text-gray-500">
                          Configurando {facilitator.personName || facilitator.personQuery || "facilitador"} como facilitador...
                        </p>
                      )}

                      <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                        <div className="rounded-md bg-white px-3 py-2">
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                            Alojamiento
                          </span>
                          <span className="font-medium text-gray-700">
                            {rowBreakdown.accommodationTotal.toFixed(0)}€
                          </span>
                          <span className="mt-1 block text-[10px] text-gray-400">
                            {rowBreakdown.roomName}
                            {selectedRoomPrice != null ? ` · ${selectedRoomPrice}€/noche` : ""}
                          </span>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2">
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                            Honorarios
                          </span>
                          <span
                            className={`font-medium ${rowBreakdown.facilitationAlreadyCovered ? "text-gray-400 line-through" : "text-gray-700"}`}
                          >
                            {rowBreakdown.feeTotal.toFixed(0)}€
                          </span>
                          <span className="mt-1 block text-[10px] text-gray-400">
                            {facilitator.feeMode === "per_person"
                              ? `${rowBreakdown.feeAmount.toFixed(0)}€ x ${parsedParticipants} participantes`
                              : "Importe total"}
                            {rowBreakdown.facilitationAlreadyCovered ? " · ya incluido" : ""}
                          </span>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2">
                          <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                            Subtotal gestion
                          </span>
                          <span className="font-medium text-gray-700">
                            {rowBreakdown.subtotal.toFixed(0)}€
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Costes extra</p>
                  <p className="text-xs text-gray-500">
                    Anade tantos conceptos como necesites con titulo e importe.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addExtraCost}>
                  Anadir coste
                </Button>
              </div>

              <div className="space-y-3">
                {extraCostItems.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-[1fr_160px_auto]">
                    <div className="space-y-1">
                      <Label className="text-xs">Titulo</Label>
                      <Input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateExtraCost(item.id, { title: e.target.value })}
                        placeholder="Sala, material, transporte..."
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Coste (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={item.cost}
                        onChange={(e) => updateExtraCost(item.id, { cost: e.target.value })}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExtraCost(item.id)}
                        disabled={extraCostItems.length === 1}
                        className="w-full text-xs text-gray-500 sm:w-auto"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Desglose
              </p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Honorarios facilitacion</span>
                  <span className="font-medium text-gray-700">
                    {breakdown.facilitationTotal.toFixed(0)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Alojamiento facilitadores</span>
                  <span className="font-medium text-gray-700">
                    {breakdown.accommodationFacilitators.toFixed(0)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Costes extra</span>
                  <span className="font-medium text-gray-700">
                    {breakdown.extraCostsTotal.toFixed(0)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Beneficio organizacion</span>
                  <span className="font-medium text-gray-700">
                    {parsedOrganizationProfit.toFixed(0)}€
                  </span>
                </div>
                {breakdown.extraRows
                  .filter((row) => row.title.trim() || row.parsedCost > 0)
                  .map((row) => (
                    <div key={row.id} className="flex justify-between pl-3 text-[11px] text-gray-500">
                      <span>{row.title.trim() || "Coste extra sin titulo"}</span>
                      <span>{row.parsedCost.toFixed(0)}€</span>
                    </div>
                  ))}
                <div className="flex justify-between border-t border-gray-200 pt-1">
                  <span className="font-medium text-gray-700">Total de costes previstos</span>
                  <span className="font-medium text-gray-700">
                    {breakdown.totalForManagement.toFixed(0)}€
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-gray-400">
                  / {parsedParticipants} participantes x {days} dias
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between rounded-md bg-primary/10 px-3 py-2">
                <span className="text-sm font-medium text-gray-700">Gestion/persona/dia</span>
                <span className="text-lg font-bold text-primary">
                  {breakdown.managementPerPersonDay.toFixed(0)}€
                </span>
              </div>
            </div>

            {saveMessage && (
              <p className={`text-sm ${saveMessage.includes("guardados") ? "text-emerald-600" : "text-red-600"}`}>
                {saveMessage}
              </p>
            )}

            <Button onClick={handleApply} disabled={!canApply || isPending} className="w-full">
              {isPending
                ? "Guardando..."
                : `Guardar costes y aplicar ${breakdown.managementPerPersonDay.toFixed(0)} €/pers./dia`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {createFacilitatorIndex != null && (
        <PersonFormDialog
          open={createFacilitatorIndex != null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setCreateFacilitatorIndex(null);
          }}
          title="Alta de facilitador"
          initial={{ default_role: "facilitator" }}
          onSubmit={async (data) => {
            const targetIndex = createFacilitatorIndex;
            if (targetIndex == null) return;
            syncFacilitator(targetIndex, {
              createPerson: {
                name_full: data.name_full,
                gender: data.gender,
                contact_email: data.contact_email || null,
                contact_phone: data.contact_phone || null,
                dietary_requirements: data.dietary_requirements,
                allergies_text: data.allergies_text || null,
              },
            });
            setCreateFacilitatorIndex(null);
          }}
        />
      )}
    </>
  );
}
