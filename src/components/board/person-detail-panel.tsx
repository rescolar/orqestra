"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  getEventPersonDetail,
  updateEventPerson,
  removeEventPerson,
} from "@/lib/actions/person";

type EventPersonDetail = {
  id: string;
  role: string;
  status: string;
  dietary_requirements: string[];
  dietary_notified: boolean;
  allergies_text: string | null;
  requests_text: string | null;
  requests_managed: boolean;
  move_with_partner: boolean;
  person: {
    name_full: string;
    name_display: string;
    name_initials: string;
    gender: string;
    contact_email: string | null;
    contact_phone: string | null;
    contact_address: string | null;
  };
};

export type PersonUpdateData = {
  role?: string;
  status?: string;
  gender?: string;
  dietary_requirements?: string[];
  dietary_notified?: boolean;
  allergies_text?: string | null;
  requests_text?: string | null;
  requests_managed?: boolean;
};

type PersonDetailPanelProps = {
  eventPersonId: string;
  eventId: string;
  onClose: () => void;
  onPersonUpdated: (id: string, changes: PersonUpdateData) => void;
  onPersonRemoved: (id: string) => void;
};

const ROLE_OPTIONS = [
  { value: "participant", label: "Participante" },
  { value: "facilitator", label: "Facilitador" },
] as const;

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmado" },
  { value: "tentative", label: "Dudoso" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const GENDER_OPTIONS = [
  { value: "male", label: "H" },
  { value: "female", label: "M" },
  { value: "other", label: "O" },
  { value: "unknown", label: "ND" },
] as const;

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "V" },
  { value: "gluten_free", label: "SG" },
  { value: "lactose_free", label: "SL" },
] as const;

export function PersonDetailPanel({
  eventPersonId,
  eventId,
  onClose,
  onPersonUpdated,
  onPersonRemoved,
}: PersonDetailPanelProps) {
  const [data, setData] = useState<EventPersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [allergiesLocal, setAllergiesLocal] = useState("");
  const [requestsLocal, setRequestsLocal] = useState("");

  useEffect(() => {
    setLoading(true);
    setConfirmDiscard(false);
    setContactOpen(false);
    getEventPersonDetail(eventPersonId).then((result) => {
      setData(result);
      setAllergiesLocal(result.allergies_text ?? "");
      setRequestsLocal(result.requests_text ?? "");
      setLoading(false);
    });
  }, [eventPersonId]);

  const saveField = useCallback(
    async (changes: Record<string, unknown>) => {
      await updateEventPerson(eventPersonId, eventId, changes);
      onPersonUpdated(eventPersonId, changes as PersonUpdateData);
    },
    [eventPersonId, eventId, onPersonUpdated]
  );

  const handleRoleChange = useCallback(
    (role: string) => {
      if (!data || data.role === role) return;
      setData((prev) => (prev ? { ...prev, role } : prev));
      saveField({ role });
    },
    [data, saveField]
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!data || data.status === status) return;
      setData((prev) => (prev ? { ...prev, status } : prev));
      saveField({ status });
    },
    [data, saveField]
  );

  const handleGenderChange = useCallback(
    (gender: string) => {
      if (!data || data.person.gender === gender) return;
      setData((prev) =>
        prev ? { ...prev, person: { ...prev.person, gender } } : prev
      );
      saveField({ gender });
    },
    [data, saveField]
  );

  const handleDietaryToggle = useCallback(
    (value: string) => {
      if (!data) return;
      const current = data.dietary_requirements;
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setData((prev) =>
        prev ? { ...prev, dietary_requirements: updated } : prev
      );
      saveField({ dietary_requirements: updated });
    },
    [data, saveField]
  );

  const handleDietaryNotified = useCallback(
    (val: boolean) => {
      setData((prev) =>
        prev ? { ...prev, dietary_notified: val } : prev
      );
      saveField({ dietary_notified: val });
    },
    [saveField]
  );

  const handleRequestsManaged = useCallback(
    (val: boolean) => {
      setData((prev) =>
        prev ? { ...prev, requests_managed: val } : prev
      );
      saveField({ requests_managed: val });
    },
    [saveField]
  );

  const handleAllergiesBlur = useCallback(() => {
    if (!data) return;
    const newVal = allergiesLocal || null;
    if (newVal === data.allergies_text) return;
    setData((prev) => (prev ? { ...prev, allergies_text: newVal } : prev));
    saveField({ allergies_text: newVal });
  }, [data, allergiesLocal, saveField]);

  const handleRequestsBlur = useCallback(() => {
    if (!data) return;
    const newVal = requestsLocal || null;
    if (newVal === data.requests_text) return;
    setData((prev) => (prev ? { ...prev, requests_text: newVal } : prev));
    saveField({ requests_text: newVal });
  }, [data, requestsLocal, saveField]);

  const handleDiscard = useCallback(async () => {
    await removeEventPerson(eventPersonId, eventId);
    onPersonRemoved(eventPersonId);
  }, [eventPersonId, eventId, onPersonRemoved]);

  if (loading) {
    return (
      <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </aside>
    );
  }

  if (!data) return null;

  const hasContact =
    data.person.contact_email ||
    data.person.contact_phone ||
    data.person.contact_address;

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-gray-100 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {data.person.name_initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-800">
            {data.person.name_full}
          </h3>
          <p className="text-xs text-gray-400">
            {data.role === "facilitator" ? "Facilitador/a" : "Participante"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="flex-1 space-y-5 p-4">
        {/* Role toggle */}
        <Section label="Rol">
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleRoleChange(opt.value)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  data.role === opt.value
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Status */}
        <Section label="Estado">
          <select
            value={data.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Section>

        {/* Gender */}
        <Section label="Género">
          <div className="flex gap-1">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGenderChange(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  data.person.gender === opt.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-500 hover:text-gray-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Contact accordion */}
        {hasContact && (
          <div>
            <button
              onClick={() => setContactOpen(!contactOpen)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Contacto
              <span className="material-symbols-outlined text-sm">
                {contactOpen ? "expand_less" : "expand_more"}
              </span>
            </button>
            {contactOpen && (
              <div className="mt-2 space-y-1.5 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                {data.person.contact_email && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-gray-400">mail</span>
                    {data.person.contact_email}
                  </div>
                )}
                {data.person.contact_phone && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-gray-400">phone</span>
                    {data.person.contact_phone}
                  </div>
                )}
                {data.person.contact_address && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-gray-400">location_on</span>
                    {data.person.contact_address}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dietary */}
        <Section label="Dieta">
          <div className="flex items-center gap-1">
            {DIETARY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleDietaryToggle(opt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  data.dietary_requirements.includes(opt.value)
                    ? "bg-warning/20 text-warning"
                    : "bg-gray-100 text-gray-500 hover:text-gray-700"
                )}
              >
                {opt.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">Gestionado</span>
              <ToggleSwitch
                checked={data.dietary_notified}
                onChange={handleDietaryNotified}
              />
            </div>
          </div>
        </Section>

        {/* Allergies */}
        <Section label="Alergias">
          <textarea
            value={allergiesLocal}
            onChange={(e) => setAllergiesLocal(e.target.value)}
            onBlur={handleAllergiesBlur}
            placeholder="Ninguna conocida"
            rows={2}
            className="w-full rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-sm outline-none focus:border-red-300"
          />
        </Section>

        {/* Preferences / Requests */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Preferencias
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">Gestionado</span>
              <ToggleSwitch
                checked={data.requests_managed}
                onChange={handleRequestsManaged}
              />
            </div>
          </div>
          <textarea
            value={requestsLocal}
            onChange={(e) => setRequestsLocal(e.target.value)}
            onBlur={handleRequestsBlur}
            placeholder="Sin preferencias"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Footer — Discard */}
      <div className="border-t border-gray-100 p-4">
        {confirmDiscard ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Se eliminará a esta persona del evento. Esta acción no se puede
              deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90"
              >
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDiscard(true)}
            className="w-full rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/5"
          >
            Descartar Participante
          </button>
        )}
      </div>
    </aside>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        checked ? "bg-success" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}
