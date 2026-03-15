"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateEventPreferences } from "@/lib/actions/participant";
import { Bath, Check, Bed } from "lucide-react";

export type AccommodationOption = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  has_private_bathroom: boolean;
  options: { occupancy: number; label: string; totalPrice: number | null }[];
};

export function AccommodationChoice({
  eventPersonId,
  accommodationOptions,
  currentRoomTypeId,
  currentOccupancy,
}: {
  eventPersonId: string;
  accommodationOptions: AccommodationOption[];
  currentRoomTypeId: string | null;
  currentOccupancy: number | null;
}) {
  const [selectedTypeId, setSelectedTypeId] = useState(currentRoomTypeId);
  const [selectedOccupancy, setSelectedOccupancy] = useState(currentOccupancy);
  const [isPending, startTransition] = useTransition();

  if (accommodationOptions.length === 0) return null;

  function handleSelect(roomTypeId: string, occupancy: number) {
    setSelectedTypeId(roomTypeId);
    setSelectedOccupancy(occupancy);
    startTransition(async () => {
      await updateEventPreferences(eventPersonId, {
        accommodation_room_type_id: roomTypeId,
        accommodation_occupancy: occupancy,
      });
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bed className="size-4" />
          Alojamiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">
          Elige tu opción de alojamiento preferida
        </p>
        {accommodationOptions.map((rt) => {
          const isSelected = selectedTypeId === rt.id;
          return (
            <div
              key={rt.id}
              className={`rounded-xl border p-4 ${isSelected ? "border-primary bg-primary/5" : "border-gray-200"}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium text-gray-900">{rt.name}</span>
                {rt.has_private_bathroom && (
                  <Bath className="size-3.5 text-blue-500" />
                )}
              </div>
              {rt.description && (
                <p className="mb-3 text-xs text-gray-500">{rt.description}</p>
              )}
              <div className="space-y-2">
                {rt.options.map((opt) => {
                  const chosen = selectedTypeId === rt.id && selectedOccupancy === opt.occupancy;
                  return (
                    <div
                      key={opt.occupancy}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-700">{opt.label}</span>
                      <div className="flex items-center gap-2">
                        {opt.totalPrice != null && (
                          <span className="text-sm font-medium text-gray-900">
                            {opt.totalPrice}€ total
                          </span>
                        )}
                        {chosen ? (
                          <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                            <Check className="size-3" />
                            Elegido
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelect(rt.id, opt.occupancy)}
                            disabled={isPending}
                            className="text-xs"
                          >
                            Elegir
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
