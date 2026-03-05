"use client";

import { useState, useCallback, useId } from "react";
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ScheduleHeader } from "./schedule-header";
import { DayTabs } from "./day-tabs";
import { DayColumn } from "./day-column";
import { BlockSidebar } from "./block-sidebar";
import { ActivityDetailPanel } from "./activity-detail-panel";
import type { DaySchedule, BlockAssignments } from "@/lib/services/schedule.service";
import {
  createBlock,
  moveBlock,
  deleteBlock,
  createActivity,
  updateActivityField,
  deleteActivity,
  assignToActivity,
  unassignFromActivity,
  getBlockAssignments,
} from "@/lib/actions/schedule";

type ScheduleClientProps = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  initialSchedule: DaySchedule[];
};

export function ScheduleClient({
  eventId,
  eventName,
  dateStart,
  dateEnd,
  initialSchedule,
}: ScheduleClientProps) {
  const dndId = useId();
  const [schedule, setSchedule] = useState(initialSchedule);
  const [selectedDay, setSelectedDay] = useState(0);

  // Assignment mode state
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [blockAssignments, setBlockAssignments] = useState<BlockAssignments | null>(null);
  const [activePersonName, setActivePersonName] = useState<{ name_display: string; name_initials: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const currentDay = schedule[selectedDay] ?? schedule[0];
  const isAssignmentMode = !!selectedBlockId;

  // Find block label for sidebar
  const selectedBlock = currentDay?.blocks.find((b) => b.id === selectedBlockId);
  const blockLabel = selectedBlock
    ? selectedBlock.activities.map((a) => a.title).join(" / ")
    : "";

  // Current activity's assigned list
  const currentActivityAssigned =
    blockAssignments?.activities.find((a) => a.id === selectedActivityId)?.assigned ?? [];
  const currentActivityTitle =
    blockAssignments?.activities.find((a) => a.id === selectedActivityId)?.title ?? "";

  const refreshAssignments = useCallback(
    async (blockId: string) => {
      const data = await getBlockAssignments(blockId, eventId);
      setBlockAssignments(data);
      // Also update signup_count in schedule state
      setSchedule((prev) =>
        prev.map((day) => ({
          ...day,
          blocks: day.blocks.map((block) => {
            if (block.id !== blockId) return block;
            return {
              ...block,
              activities: block.activities.map((act) => {
                const match = data.activities.find((a) => a.id === act.id);
                return match ? { ...act, signup_count: match.assigned.length } : act;
              }),
            };
          }),
        }))
      );
    },
    [eventId]
  );

  const handleActivityClick = useCallback(
    async (activityId: string, blockId: string) => {
      // Clicking common block or same activity closes panels
      const block = currentDay?.blocks.find((b) => b.id === blockId);
      if (!block || block.type !== "parallel") {
        setSelectedBlockId(null);
        setSelectedActivityId(null);
        setBlockAssignments(null);
        return;
      }

      setSelectedActivityId(activityId);

      if (blockId !== selectedBlockId) {
        setSelectedBlockId(blockId);
        await refreshAssignments(blockId);
      }
    },
    [currentDay, selectedBlockId, refreshAssignments]
  );

  const handleClosePanel = useCallback(() => {
    setSelectedBlockId(null);
    setSelectedActivityId(null);
    setBlockAssignments(null);
  }, []);

  const handleAssign = useCallback(
    async (activityId: string, eventPersonId: string) => {
      if (!selectedBlockId || !blockAssignments) return;

      // Optimistic update
      setBlockAssignments((prev) => {
        if (!prev) return prev;
        const person =
          prev.unassigned.find((p) => p.id === eventPersonId) ||
          prev.activities.flatMap((a) => a.assigned).find((p) => p.id === eventPersonId);
        if (!person) return prev;

        return {
          activities: prev.activities.map((a) => ({
            ...a,
            assigned:
              a.id === activityId
                ? [...a.assigned.filter((p) => p.id !== eventPersonId), person]
                : a.assigned.filter((p) => p.id !== eventPersonId),
          })),
          unassigned: prev.unassigned.filter((p) => p.id !== eventPersonId),
        };
      });

      // Optimistic signup_count update
      setSchedule((prev) =>
        prev.map((day) => ({
          ...day,
          blocks: day.blocks.map((block) => {
            if (block.id !== selectedBlockId) return block;
            return {
              ...block,
              activities: block.activities.map((act) => {
                if (act.id === activityId) return { ...act, signup_count: act.signup_count + 1 };
                // If person was reassigned from another activity in this block
                const wasHere = blockAssignments?.activities
                  .find((a) => a.id === act.id)
                  ?.assigned.some((p) => p.id === eventPersonId);
                if (wasHere) return { ...act, signup_count: Math.max(0, act.signup_count - 1) };
                return act;
              }),
            };
          }),
        }))
      );

      try {
        await assignToActivity(activityId, eventPersonId, eventId);
        await refreshAssignments(selectedBlockId);
      } catch {
        // Revert on error by refetching
        await refreshAssignments(selectedBlockId);
      }
    },
    [selectedBlockId, blockAssignments, eventId, refreshAssignments]
  );

  const handleUnassign = useCallback(
    async (eventPersonId: string) => {
      if (!selectedBlockId || !selectedActivityId || !blockAssignments) return;

      // Find the person being unassigned
      const person = blockAssignments.activities
        .flatMap((a) => a.assigned)
        .find((p) => p.id === eventPersonId);
      if (!person) return;

      // Optimistic update
      setBlockAssignments((prev) => {
        if (!prev) return prev;
        return {
          activities: prev.activities.map((a) => ({
            ...a,
            assigned: a.assigned.filter((p) => p.id !== eventPersonId),
          })),
          unassigned: [...prev.unassigned, person].sort((a, b) =>
            a.name_display.localeCompare(b.name_display)
          ),
        };
      });

      setSchedule((prev) =>
        prev.map((day) => ({
          ...day,
          blocks: day.blocks.map((block) => {
            if (block.id !== selectedBlockId) return block;
            return {
              ...block,
              activities: block.activities.map((act) =>
                act.id === selectedActivityId
                  ? { ...act, signup_count: Math.max(0, act.signup_count - 1) }
                  : act
              ),
            };
          }),
        }))
      );

      try {
        await unassignFromActivity(selectedActivityId, eventPersonId, eventId);
        await refreshAssignments(selectedBlockId);
      } catch {
        await refreshAssignments(selectedBlockId);
      }
    },
    [selectedBlockId, selectedActivityId, blockAssignments, eventId, refreshAssignments]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActivePersonName(null);
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Target must be an activity drop zone
      if (!overId.startsWith("activity-")) return;
      const targetActivityId = overId.replace("activity-", "");

      // Source: unassigned or assigned
      let eventPersonId: string;
      if (activeId.startsWith("unassigned-")) {
        eventPersonId = activeId.replace("unassigned-", "");
      } else if (activeId.startsWith("assigned-")) {
        eventPersonId = activeId.replace("assigned-", "");
      } else {
        return;
      }

      handleAssign(targetActivityId, eventPersonId);
    },
    [handleAssign]
  );

  const handleDragStart = useCallback(
    (event: { active: { id: string | number } }) => {
      const id = event.active.id as string;
      let personId: string | null = null;
      if (id.startsWith("unassigned-")) personId = id.replace("unassigned-", "");
      else if (id.startsWith("assigned-")) personId = id.replace("assigned-", "");

      if (personId && blockAssignments) {
        const person =
          blockAssignments.unassigned.find((p) => p.id === personId) ||
          blockAssignments.activities.flatMap((a) => a.assigned).find((p) => p.id === personId);
        if (person) {
          setActivePersonName({ name_display: person.name_display, name_initials: person.name_initials });
        }
      }
    },
    [blockAssignments]
  );

  // Click person in sidebar → assign to selected activity
  const handleSidebarPersonClick = useCallback(
    (eventPersonId: string) => {
      if (selectedActivityId) {
        handleAssign(selectedActivityId, eventPersonId);
      }
    },
    [selectedActivityId, handleAssign]
  );

  // Standard schedule handlers (unchanged)
  const handleAddBlock = useCallback(
    async (type: "common" | "parallel") => {
      const block = await createBlock(eventId, {
        day_index: selectedDay,
        type,
      });
      setSchedule((prev) => {
        const updated = [...prev];
        const day = { ...updated[selectedDay] };
        day.blocks = [
          ...day.blocks,
          {
            id: block.id,
            type: block.type,
            position: block.position,
            activities: block.activities.map((a) => ({
              id: a.id,
              title: a.title,
              description: a.description,
              time_label: a.time_label,
              position: a.position,
              signup_count: a._count.signups,
            })),
          },
        ];
        updated[selectedDay] = day;
        return updated;
      });
    },
    [eventId, selectedDay]
  );

  const handleMoveBlock = useCallback(
    async (blockId: string, direction: "up" | "down") => {
      await moveBlock(blockId, eventId, direction);
      setSchedule((prev) => {
        const updated = [...prev];
        const day = { ...updated[selectedDay] };
        const blocks = [...day.blocks];
        const idx = blocks.findIndex((b) => b.id === blockId);
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= blocks.length) return prev;
        const tempPos = blocks[idx].position;
        blocks[idx] = { ...blocks[idx], position: blocks[swapIdx].position };
        blocks[swapIdx] = { ...blocks[swapIdx], position: tempPos };
        blocks.sort((a, b) => a.position - b.position);
        day.blocks = blocks;
        updated[selectedDay] = day;
        return updated;
      });
    },
    [eventId, selectedDay]
  );

  const handleDeleteBlock = useCallback(
    async (blockId: string) => {
      if (blockId === selectedBlockId) handleClosePanel();
      await deleteBlock(blockId, eventId);
      setSchedule((prev) => {
        const updated = [...prev];
        const day = { ...updated[selectedDay] };
        day.blocks = day.blocks.filter((b) => b.id !== blockId);
        updated[selectedDay] = day;
        return updated;
      });
    },
    [eventId, selectedDay, selectedBlockId, handleClosePanel]
  );

  const handleUpdateActivity = useCallback(
    async (
      activityId: string,
      data: {
        title?: string;
        description?: string | null;
        time_label?: string | null;
      }
    ) => {
      await updateActivityField(activityId, eventId, data);
      setSchedule((prev) => {
        const updated = [...prev];
        const day = { ...updated[selectedDay] };
        day.blocks = day.blocks.map((block) => ({
          ...block,
          activities: block.activities.map((act) =>
            act.id === activityId ? { ...act, ...data } : act
          ),
        }));
        updated[selectedDay] = day;
        return updated;
      });
      // Also update in blockAssignments if open
      if (blockAssignments && data.title) {
        setBlockAssignments((prev) =>
          prev
            ? {
                ...prev,
                activities: prev.activities.map((a) =>
                  a.id === activityId ? { ...a, title: data.title! } : a
                ),
              }
            : prev
        );
      }
    },
    [eventId, selectedDay, blockAssignments]
  );

  const handleDeleteActivity = useCallback(
    async (activityId: string) => {
      if (activityId === selectedActivityId) handleClosePanel();
      await deleteActivity(activityId, eventId);
      setSchedule((prev) => {
        const updated = [...prev];
        const day = { ...updated[selectedDay] };
        day.blocks = day.blocks
          .map((block) => ({
            ...block,
            activities: block.activities.filter((a) => a.id !== activityId),
          }))
          .filter((block) => block.activities.length > 0);
        updated[selectedDay] = day;
        return updated;
      });
    },
    [eventId, selectedDay, selectedActivityId, handleClosePanel]
  );

  const handleAddActivity = useCallback(
    async (blockId: string) => {
      const activity = await createActivity(blockId, eventId, {});
      setSchedule((prev) => {
        const updated = [...prev];
        const day = { ...updated[selectedDay] };
        day.blocks = day.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                activities: [
                  ...block.activities,
                  {
                    id: activity.id,
                    title: activity.title,
                    description: activity.description,
                    time_label: activity.time_label,
                    position: activity.position,
                    signup_count: activity._count.signups,
                  },
                ],
              }
            : block
        );
        updated[selectedDay] = day;
        return updated;
      });
      // Refresh assignments if this block is selected
      if (blockId === selectedBlockId) {
        await refreshAssignments(blockId);
      }
    },
    [eventId, selectedDay, selectedBlockId, refreshAssignments]
  );

  if (!currentDay) return null;

  const scheduleContent = (
    <>
      <ScheduleHeader
        eventId={eventId}
        eventName={eventName}
        dateStart={dateStart}
        dateEnd={dateEnd}
      />
      <DayTabs
        days={schedule.map((d) => ({ day_index: d.day_index, date: d.date }))}
        selectedDay={selectedDay}
        onSelectDay={(day) => {
          setSelectedDay(day);
          handleClosePanel();
        }}
      />
    </>
  );

  if (isAssignmentMode) {
    return (
      <DndContext
        id={dndId}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {scheduleContent}
        <div className="flex flex-1 overflow-hidden">
          <BlockSidebar
            unassigned={blockAssignments?.unassigned ?? []}
            blockLabel={blockLabel}
            onPersonClick={handleSidebarPersonClick}
          />
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <DayColumn
              day={currentDay}
              onMoveBlock={handleMoveBlock}
              onDeleteBlock={handleDeleteBlock}
              onUpdateActivity={handleUpdateActivity}
              onDeleteActivity={handleDeleteActivity}
              onAddActivity={handleAddActivity}
              onAddBlock={handleAddBlock}
              onActivityClick={handleActivityClick}
              selectedActivityId={selectedActivityId ?? undefined}
              isAssignmentMode
            />
          </div>
          {selectedActivityId && (
            <ActivityDetailPanel
              activityTitle={currentActivityTitle}
              assigned={currentActivityAssigned}
              onUnassign={handleUnassign}
              onClose={handleClosePanel}
            />
          )}
        </div>
        <DragOverlay>
          {activePersonName ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-white px-3 py-2 shadow-lg">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {activePersonName.name_initials}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {activePersonName.name_display}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <>
      {scheduleContent}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto w-full max-w-4xl">
          <DayColumn
            day={currentDay}
            onMoveBlock={handleMoveBlock}
            onDeleteBlock={handleDeleteBlock}
            onUpdateActivity={handleUpdateActivity}
            onDeleteActivity={handleDeleteActivity}
            onAddActivity={handleAddActivity}
            onAddBlock={handleAddBlock}
            onActivityClick={handleActivityClick}
            selectedActivityId={selectedActivityId ?? undefined}
          />
        </div>
      </div>
    </>
  );
}
