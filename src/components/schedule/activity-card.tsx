"use client";

import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";

type ActivityCardProps = {
  activity: {
    id: string;
    title: string;
    description: string | null;
    signup_count: number;
  };
  isParallel: boolean;
  onUpdate: (
    activityId: string,
    data: { title?: string; description?: string | null }
  ) => void;
  onDelete: (activityId: string) => void;
  onActivityClick?: (activityId: string) => void;
  isSelected?: boolean;
  isDropTarget?: boolean;
};

function InlineEdit({
  value,
  onSave,
  placeholder,
  multiline,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const handleBlur = () => {
    setEditing(false);
    if (text !== value) onSave(text);
  };

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
          setTimeout(() => ref.current?.focus(), 0);
        }}
        className={`cursor-text text-left ${className}`}
      >
        {value || <span className="text-gray-400">{placeholder}</span>}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setText(value);
            setEditing(false);
          }
        }}
        rows={2}
        className={`w-full rounded border border-primary/30 bg-white p-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setText(value);
          setEditing(false);
        }
      }}
      className={`w-full rounded border border-primary/30 bg-white p-1 focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
    />
  );
}

export function ActivityCard({
  activity,
  isParallel,
  onUpdate,
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
    if (isParallel && onActivityClick) {
      onActivityClick(activity.id);
    }
  };

  return (
    <div
      ref={isDropTarget ? setNodeRef : undefined}
      onClick={handleClick}
      className={`group rounded-xl p-4 ${
        isParallel ? "border border-gray-200 bg-white" : "bg-slate-50"
      } ${isParallel && onActivityClick ? "cursor-pointer" : ""} ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isOver ? "border-primary border-dashed bg-primary/5" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={activity.title}
            onSave={(title) => onUpdate(activity.id, { title })}
            placeholder="Título de la actividad"
            className="font-semibold text-gray-900"
          />
          <div className="mt-2">
            <InlineEdit
              value={activity.description ?? ""}
              onSave={(description) =>
                onUpdate(activity.id, { description: description || null })
              }
              placeholder="Descripción..."
              multiline
              className="text-sm text-gray-600"
            />
          </div>
          {isParallel && (
            <p className="mt-3 text-xs font-medium text-primary">
              <span className="material-symbols-outlined mr-1 align-middle text-sm">
                group
              </span>
              {activity.signup_count} inscritos
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
    </div>
  );
}
