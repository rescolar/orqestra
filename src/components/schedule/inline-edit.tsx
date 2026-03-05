"use client";

import { useState, useRef } from "react";

export function InlineEdit({
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

  // Sync when value changes externally
  if (!editing && text !== value) setText(value);

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
