"use client";

import { useState } from "react";
import { updateParticipantDiscovery } from "@/lib/actions/event";

export function DiscoveryToggle({
  eventId,
  initial,
}: {
  eventId: string;
  initial: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);

  async function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    await updateParticipantDiscovery(eventId, next);
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Descubrimiento</h3>
      <label className="flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-700">Participantes visibles entre sí</span>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? "Los participantes pueden ver quién más asiste."
              : "Los participantes no ven a otros participantes."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </label>
    </div>
  );
}
