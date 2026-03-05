"use client";

import { useDroppable } from "@dnd-kit/core";

type ActivityCardProps = {
  activity: {
    id: string;
    title: string;
    description: string | null;
    signup_count: number;
    max_participants: number | null;
    closed: boolean;
  };
  isParallel: boolean;
  onDelete: (activityId: string) => void;
  onActivityClick?: (activityId: string) => void;
  isSelected?: boolean;
  isDropTarget?: boolean;
};

export function ActivityCard({
  activity,
  isParallel,
  onDelete,
  onActivityClick,
  isSelected,
  isDropTarget,
}: ActivityCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `activity-${activity.id}`,
    disabled: !isDropTarget,
  });

  const handleClick = () => {
    if (onActivityClick) {
      onActivityClick(activity.id);
    }
  };

  const isOverCapacity =
    activity.max_participants != null &&
    activity.signup_count > activity.max_participants;

  return (
    <div
      ref={isDropTarget ? setNodeRef : undefined}
      onClick={handleClick}
      className={`group flex min-h-[120px] flex-col rounded-xl p-4 ${
        isParallel ? "border border-gray-200 bg-white" : "bg-slate-50"
      } ${onActivityClick ? "cursor-pointer" : ""} ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isOver ? "border-primary border-dashed bg-primary/5" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">
            {activity.title}
          </p>
          {activity.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-600">
              {activity.description}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(activity.id);
          }}
          className="rounded p-1 text-gray-300 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        {isParallel && (
          <p
            className={`text-xs font-medium ${
              isOverCapacity ? "text-danger" : "text-primary"
            }`}
          >
            <span className="material-symbols-outlined mr-1 align-middle text-sm">
              {isOverCapacity ? "warning" : "group"}
            </span>
            {activity.max_participants != null
              ? `${activity.signup_count}/${activity.max_participants}`
              : `${activity.signup_count} inscritos`}
          </p>
        )}
        {activity.closed && (
          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
            Cerrada
          </span>
        )}
      </div>
    </div>
  );
}
