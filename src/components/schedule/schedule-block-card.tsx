"use client";

import { ActivityCard } from "./activity-card";

type Activity = {
  id: string;
  title: string;
  description: string | null;
  time_label: string | null;
  signup_count: number;
};

type ScheduleBlockCardProps = {
  block: {
    id: string;
    type: "common" | "parallel";
    position: number;
    activities: Activity[];
  };
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
  onDeleteBlock: (blockId: string) => void;
  onUpdateActivity: (
    activityId: string,
    data: { title?: string; description?: string | null; time_label?: string | null }
  ) => void;
  onDeleteActivity: (activityId: string) => void;
  onAddActivity: (blockId: string) => void;
  isFirst: boolean;
  isLast: boolean;
  onActivityClick?: (activityId: string, blockId: string) => void;
  selectedActivityId?: string;
  isAssignmentMode?: boolean;
};

export function ScheduleBlockCard({
  block,
  onMoveBlock,
  onDeleteBlock,
  onUpdateActivity,
  onDeleteActivity,
  onAddActivity,
  isFirst,
  isLast,
  onActivityClick,
  selectedActivityId,
  isAssignmentMode,
}: ScheduleBlockCardProps) {
  const isParallel = block.type === "parallel";

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-500">
          {isParallel ? "Paralelo" : "Común"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMoveBlock(block.id, "up")}
            disabled={isFirst}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-lg">
              expand_less
            </span>
          </button>
          <button
            onClick={() => onMoveBlock(block.id, "down")}
            disabled={isLast}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-lg">
              expand_more
            </span>
          </button>
          <button
            onClick={() => onDeleteBlock(block.id)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-danger"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>

      {isParallel ? (
        <>
          <div
            className={`grid gap-3 ${
              block.activities.length === 3 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {block.activities.map((act) => (
              <ActivityCard
                key={act.id}
                activity={act}
                isParallel
                onUpdate={onUpdateActivity}
                onDelete={onDeleteActivity}
                onActivityClick={
                  onActivityClick
                    ? (actId) => onActivityClick(actId, block.id)
                    : undefined
                }
                isSelected={selectedActivityId === act.id}
                isDropTarget={!!isAssignmentMode}
              />
            ))}
          </div>
          {block.activities.length < 3 && (
            <button
              onClick={() => onAddActivity(block.id)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Añadir actividad
            </button>
          )}
        </>
      ) : (
        <ActivityCard
          activity={block.activities[0]}
          isParallel={false}
          onUpdate={onUpdateActivity}
          onDelete={onDeleteActivity}
        />
      )}
    </div>
  );
}
