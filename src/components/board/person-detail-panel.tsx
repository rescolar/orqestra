"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  getEventPersonDetail,
  updateEventPerson,
  removeEventPerson,
} from "@/lib/actions/person";
import {
  removeMemberFromGroup,
  toggleInseparable,
} from "@/lib/actions/group";

type GroupMember = {
  id: string;
  inseparable_with_id: string | null;
  person: { name_display: string };
};

type GroupData = {
  id: string;
  name: string;
  members: GroupMember[];
};

type EventPersonDetail = {
  id: string;
  role: string;
  status: string;
  inseparable_with_id: string | null;
  dietary_requirements: string[];
  dietary_notified: boolean;
  allergies_text: string | null;
  requests_text: string | null;
  requests_managed: boolean;
  group: GroupData | null;
  room: {
    display_name: string | null;
    internal_number: string;
  } | null;
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
  refreshKey?: number;
  onClose: () => void;
  onPersonUpdated: (id: string, changes: PersonUpdateData) => void;
  onPersonRemoved: (id: string) => void;
  onPersonClick?: (id: string) => void;
  onBoardRefresh?: () => void;
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
  refreshKey,
  onClose,
  onPersonUpdated,
  onPersonRemoved,
  onPersonClick,
  onBoardRefresh,
}: PersonDetailPanelProps) {
  const [data, setData] = useState<EventPersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [relationsIsOver, setRelationsIsOver] = useState(false);
  const [allergiesLocal, setAllergiesLocal] = useState("");
  const [requestsLocal, setRequestsLocal] = useState("");

  useEffect(() => {
    setLoading(true);
    setConfirmDiscard(false);
    getEventPersonDetail(eventPersonId).then((result) => {
      setData(result);
      setAllergiesLocal(result.allergies_text ?? "");
      setRequestsLocal(result.requests_text ?? "");
      setLoading(false);
    });
  }, [eventPersonId, refreshKey]);

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

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      await removeMemberFromGroup(memberId, eventId);
      const updated = await getEventPersonDetail(eventPersonId);
      setData(updated);
    },
    [eventPersonId, eventId]
  );

  const handleToggleInseparable = useCallback(
    async (partnerId: string) => {
      await toggleInseparable(eventPersonId, partnerId, eventId);
      const updated = await getEventPersonDetail(eventPersonId);
      setData(updated);
      onBoardRefresh?.();
    },
    [eventPersonId, eventId, onBoardRefresh]
  );

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

  const otherMembers = data.group
    ? data.group.members.filter((m) => m.id !== data.id)
    : [];

  // Compute summaries
  const roleSummary = ROLE_OPTIONS.find((o) => o.value === data.role)?.label ?? "";
  const statusSummary = STATUS_OPTIONS.find((o) => o.value === data.status)?.label ?? "";
  const genderSummary = GENDER_OPTIONS.find((o) => o.value === data.person.gender)?.label ?? "ND";
  const contactSummary =
    data.person.contact_email || data.person.contact_phone || data.person.contact_address || "\u2014";
  const inseparablePartner = otherMembers.find((m) => m.id === data.inseparable_with_id);
  const relationsSummary = inseparablePartner
    ? inseparablePartner.person.name_display
    : otherMembers.length > 0
      ? "Si"
      : "No";
  const activeDiets = DIETARY_OPTIONS.filter((o) => data.dietary_requirements.includes(o.value)).map((o) => o.label);
  const dietSummary = activeDiets.length > 0 ? activeDiets.join(", ") : "No";
  const allergiesSummary = data.allergies_text ? "Si" : "No";
  const preferencesSummary = data.requests_text ? "Si" : "No";

  const dietaryTrailing = (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="text-[10px] text-gray-400">Gestionado</span>
      <ToggleSwitch checked={data.dietary_notified} onChange={handleDietaryNotified} />
    </div>
  );

  const preferencesTrailing = (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="text-[10px] text-gray-400">Gestionado</span>
      <ToggleSwitch checked={data.requests_managed} onChange={handleRequestsManaged} />
    </div>
  );

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
            {data.room ? (
              <span className="ml-1">
                &middot; {data.room.display_name || `Hab ${data.room.internal_number}`}
              </span>
            ) : (
              <span className="ml-1">&middot; Sin asignar</span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="flex-1 divide-y divide-gray-100 px-4">
        {/* Role toggle */}
        <CollapsibleSection label="Rol" summary={roleSummary}>
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
        </CollapsibleSection>

        {/* Status */}
        <CollapsibleSection label="Estado" summary={statusSummary}>
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
        </CollapsibleSection>

        {/* Gender */}
        <CollapsibleSection label="Genero" summary={genderSummary}>
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
        </CollapsibleSection>

        {/* Contact */}
        <CollapsibleSection label="Contacto" summary={contactSummary}>
          <div className="space-y-1.5 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
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
            {!data.person.contact_email && !data.person.contact_phone && !data.person.contact_address && (
              <p className="text-xs text-gray-400">Sin datos de contacto</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Relations */}
        <CollapsibleSection label="Relaciones" summary={relationsSummary} forceOpen={relationsIsOver}>
          <RelationsDropZone
            eventPersonId={data.id}
            inseparableWithId={data.inseparable_with_id}
            otherMembers={otherMembers}
            onRemoveMember={handleRemoveMember}
            onToggleInseparable={handleToggleInseparable}
            onPersonClick={onPersonClick}
            onIsOverChange={setRelationsIsOver}
          />
        </CollapsibleSection>

        {/* Dietary */}
        <CollapsibleSection label="Dieta" summary={dietSummary} trailing={dietaryTrailing}>
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
          </div>
        </CollapsibleSection>

        {/* Allergies */}
        <CollapsibleSection label="Alergias" summary={allergiesSummary}>
          <textarea
            value={allergiesLocal}
            onChange={(e) => setAllergiesLocal(e.target.value)}
            onBlur={handleAllergiesBlur}
            placeholder="Ninguna conocida"
            rows={2}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm outline-none",
              allergiesLocal
                ? "border-red-200 bg-red-50/50 focus:border-red-300"
                : "border-gray-200 focus:border-primary"
            )}
          />
        </CollapsibleSection>

        {/* Preferences / Requests */}
        <CollapsibleSection label="Preferencias" summary={preferencesSummary} trailing={preferencesTrailing}>
          <textarea
            value={requestsLocal}
            onChange={(e) => setRequestsLocal(e.target.value)}
            onBlur={handleRequestsBlur}
            placeholder="Sin preferencias"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </CollapsibleSection>
      </div>

      {/* Footer — Discard */}
      <div className="border-t border-gray-100 p-4">
        {confirmDiscard ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Se eliminara a esta persona del evento. Esta accion no se puede
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

function RelationsDropZone({
  eventPersonId,
  inseparableWithId,
  otherMembers,
  onRemoveMember,
  onToggleInseparable,
  onPersonClick,
  onIsOverChange,
}: {
  eventPersonId: string;
  inseparableWithId: string | null;
  otherMembers: GroupMember[];
  onRemoveMember: (memberId: string) => void;
  onToggleInseparable: (partnerId: string) => void;
  onPersonClick?: (id: string) => void;
  onIsOverChange?: (isOver: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `relations-${eventPersonId}`,
  });

  const prevIsOver = useRef(isOver);
  useEffect(() => {
    if (prevIsOver.current !== isOver) {
      prevIsOver.current = isOver;
      onIsOverChange?.(isOver);
    }
  }, [isOver, onIsOverChange]);

  // Sort: inseparable first, then alphabetical
  const sorted = [...otherMembers].sort((a, b) => {
    if (a.id === inseparableWithId) return -1;
    if (b.id === inseparableWithId) return 1;
    return a.person.name_display.localeCompare(b.person.name_display);
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[40px] rounded-lg border border-dashed p-2 transition-colors",
        isOver
          ? "border-primary bg-primary/5"
          : otherMembers.length > 0
            ? "border-gray-200 bg-gray-50/50"
            : "border-gray-300"
      )}
    >
      {otherMembers.length === 0 ? (
        <p className={cn(
          "text-center text-xs py-1",
          isOver ? "text-primary" : "text-gray-400"
        )}>
          {isOver ? "Soltar para relacionar" : "Arrastra una persona aqui"}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {sorted.map((m) => {
              const isInseparable = inseparableWithId === m.id;
              return (
                <span
                  key={m.id}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors",
                    isInseparable
                      ? "bg-primary text-white"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <button
                    onClick={() => onToggleInseparable(m.id)}
                    className={cn(
                      "flex items-center gap-1",
                      isInseparable ? "text-white" : "text-primary hover:text-primary/80"
                    )}
                    title={isInseparable ? "Quitar inseparable" : "Marcar como inseparable"}
                  >
                    <span className={cn(
                      "material-symbols-outlined text-sm",
                      isInseparable ? "opacity-100" : "opacity-0"
                    )}>link</span>
                    {m.person.name_display}
                  </button>
                  <button
                    onClick={() => onRemoveMember(m.id)}
                    className={cn(
                      "hover:opacity-100",
                      isInseparable ? "text-white/70 hover:text-white" : "text-primary/60 hover:text-primary"
                    )}
                    title="Quitar relacion"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          {isOver && (
            <p className="text-center text-xs text-primary">
              Soltar para relacionar
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  label,
  summary,
  children,
  trailing,
  forceOpen,
}: {
  label: string;
  summary: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div className="py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2"
      >
        <span className="material-symbols-outlined text-base text-gray-400 transition-transform" style={{ transform: open ? "rotate(90deg)" : undefined }}>
          chevron_right
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <span className="flex-1" />
        <span className="truncate text-xs text-gray-500 max-w-[140px] text-right">
          {summary}
        </span>
        {trailing && <span className="ml-1 shrink-0">{trailing}</span>}
      </button>
      {open && <div className="mt-2">{children}</div>}
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
