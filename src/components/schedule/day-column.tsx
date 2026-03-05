"use client";

import { ScheduleBlockCard } from "./schedule-block-card";
import type { DaySchedule } from "@/lib/services/schedule.service";

type DayColumnProps = {
  day: DaySchedule;
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
  onDeleteBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, data: { time_label?: string | null }) => void;
  onDeleteActivity: (activityId: string) => void;
  onAddActivity: (blockId: string) => void;
  onAddBlock: (type: "common" | "parallel") => void;
  onActivityClick?: (activityId: string, blockId: string) => void;
  selectedActivityId?: string;
  isAssignmentMode?: boolean;
};

export function DayColumn({
  day,
  onMoveBlock,
  onDeleteBlock,
  onUpdateBlock,
  onDeleteActivity,
  onAddActivity,
  onAddBlock,
  onActivityClick,
  selectedActivityId,
  isAssignmentMode,
}: DayColumnProps) {
  return (
    <div className="space-y-4">
      {day.blocks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-400">
          No hay bloques para este día. Añade uno abajo.
        </div>
      )}

      {day.blocks.map((block, i) => (
        <ScheduleBlockCard
          key={block.id}
          block={block}
          onMoveBlock={onMoveBlock}
          onDeleteBlock={onDeleteBlock}
          onUpdateBlock={onUpdateBlock}
          onDeleteActivity={onDeleteActivity}
          onAddActivity={onAddActivity}
          isFirst={i === 0}
          isLast={i === day.blocks.length - 1}
          onActivityClick={onActivityClick}
          selectedActivityId={selectedActivityId}
          isAssignmentMode={isAssignmentMode}
        />
      ))}

      <div className="flex gap-3">
        <button
          onClick={() => onAddBlock("common")}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-primary hover:text-primary"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Añadir bloque común
        </button>
        <button
          onClick={() => onAddBlock("parallel")}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-primary hover:text-primary"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Añadir bloque paralelo
        </button>
      </div>
    </div>
  );
}
