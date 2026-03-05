"use client";

import { useState, useMemo } from "react";
import type { DaySchedule } from "@/lib/services/schedule.service";

type IncidentsPanelProps = {
  schedule: DaySchedule[];
  totalConfirmedParticipants: number;
  onClose: () => void;
  onItemClick: (dayIndex: number, activityId: string, blockId: string) => void;
};

type UnassignedBlockItem = {
  blockId: string;
  dayIndex: number;
  dayLabel: string;
  activityLabels: string;
  assignedCount: number;
  totalParticipants: number;
  firstActivityId: string;
};

type OverCapacityItem = {
  activityId: string;
  blockId: string;
  dayIndex: number;
  dayLabel: string;
  activityTitle: string;
  signupCount: number;
  maxParticipants: number;
};

function formatDayLabel(date: Date): string {
  return new Date(date).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
  });
}

function CollapsibleSection({
  title,
  icon,
  color,
  count,
  children,
}: {
  title: string;
  icon: string;
  color: "warning" | "danger";
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  const colorClasses = {
    warning: "text-warning bg-warning/10",
    danger: "text-danger bg-danger/10",
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className={`material-symbols-outlined text-base ${colorClasses[color].split(" ")[0]}`}>
          {icon}
        </span>
        <span className="flex-1 text-sm font-medium text-gray-700">{title}</span>
        <span
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${colorClasses[color]}`}
        >
          {count}
        </span>
        <span className="material-symbols-outlined text-base text-gray-400">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  );
}

export function ScheduleIncidentsPanel({
  schedule,
  totalConfirmedParticipants,
  onClose,
  onItemClick,
}: IncidentsPanelProps) {
  const { unassignedBlocks, overCapacityActivities } = useMemo(() => {
    const unassigned: UnassignedBlockItem[] = [];
    const overCapacity: OverCapacityItem[] = [];

    for (const day of schedule) {
      const dayLabel = formatDayLabel(day.date);
      for (const block of day.blocks) {
        if (block.type !== "parallel") continue;

        const totalSignups = block.activities.reduce((sum, a) => sum + a.signup_count, 0);
        if (totalSignups < totalConfirmedParticipants) {
          unassigned.push({
            blockId: block.id,
            dayIndex: day.day_index,
            dayLabel,
            activityLabels: block.activities.map((a) => a.title).join(" / "),
            assignedCount: totalSignups,
            totalParticipants: totalConfirmedParticipants,
            firstActivityId: block.activities[0]?.id ?? "",
          });
        }

        for (const act of block.activities) {
          if (act.max_participants != null && act.signup_count > act.max_participants) {
            overCapacity.push({
              activityId: act.id,
              blockId: block.id,
              dayIndex: day.day_index,
              dayLabel,
              activityTitle: act.title,
              signupCount: act.signup_count,
              maxParticipants: act.max_participants,
            });
          }
        }
      }
    }

    return { unassignedBlocks: unassigned, overCapacityActivities: overCapacity };
  }, [schedule, totalConfirmedParticipants]);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Incidencias</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {unassignedBlocks.length === 0 && overCapacityActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <span className="material-symbols-outlined mb-2 text-3xl">
              check_circle
            </span>
            <p className="text-sm">Sin incidencias</p>
          </div>
        ) : (
          <>
            <CollapsibleSection
              title="Bloques sin asignar"
              icon="group_off"
              color="warning"
              count={unassignedBlocks.length}
            >
              {unassignedBlocks.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400">
                  Todos los bloques están completos
                </p>
              ) : (
                <div className="divide-y">
                  {unassignedBlocks.map((item) => (
                    <button
                      key={item.blockId}
                      onClick={() =>
                        onItemClick(item.dayIndex, item.firstActivityId, item.blockId)
                      }
                      className="w-full px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <p className="truncate text-sm font-medium text-gray-700">
                        {item.activityLabels}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {item.dayLabel} · {item.assignedCount}/{item.totalParticipants} asignados
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Actividades con exceso"
              icon="warning"
              color="danger"
              count={overCapacityActivities.length}
            >
              {overCapacityActivities.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400">
                  Ninguna actividad excede el aforo
                </p>
              ) : (
                <div className="divide-y">
                  {overCapacityActivities.map((item) => (
                    <button
                      key={item.activityId}
                      onClick={() =>
                        onItemClick(item.dayIndex, item.activityId, item.blockId)
                      }
                      className="w-full px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <p className="truncate text-sm font-medium text-gray-700">
                        {item.activityTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-danger">
                        {item.dayLabel} · {item.signupCount}/{item.maxParticipants} inscritos
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>
    </aside>
  );
}
