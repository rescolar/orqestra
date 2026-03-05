"use client";

import { useState, useCallback, useId, useMemo } from "react";
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
import { ScheduleIncidentsPanel } from "./schedule-incidents-panel";
import type { DaySchedule, BlockAssignments } from "@/lib/services/schedule.service";
import {
  createBlock,
  moveBlock,
  deleteBlock,
  createActivity,
  updateActivityField,
  updateBlockField,
  deleteActivity,
  assignToActivity,
  unassignFromActivity,
  getBlockAssignments,
  confirmSchedule as confirmScheduleAction,
} from "@/lib/actions/schedule";

type ScheduleClientProps = {
  eventId: string;
  eventName: string;
  dateStart: Date;
  dateEnd: Date;
  initialSchedule: DaySchedule[];
  scheduleConfirmed: boolean;
  totalConfirmedParticipants: number;
};

export function ScheduleClient({
  eventId,
  eventName,
  dateStart,
  dateEnd,
  initialSchedule,
  scheduleConfirmed: initialScheduleConfirmed,
  totalConfirmedParticipants,
}: ScheduleClientProps) {
  const dndId = useId();
  const [schedule, setSchedule] = useState(initialSchedule);
  const [selectedDay, setSelectedDay] = useState(0);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(initialScheduleConfirmed);

  // Assignment mode state (parallel blocks)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [blockAssignments, setBlockAssignments] = useState<BlockAssignments | null>(null);
  const [activePersonName, setActivePersonName] = useState<{ name_display: string; name_initials: string } | null>(null);

  // Common block detail panel state
  const [commonActivityId, setCommonActivityId] = useState<string | null>(null);

  // Incidents panel state
  const [showIncidentsPanel, setShowIncidentsPanel] = useState(false);

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

  // Current activity data for detail panel (from blockAssignments or schedule)
  const currentActivityData = useMemo(() => {
    if (selectedActivityId && blockAssignments) {
      const act = blockAssignments.activities.find((a) => a.id === selectedActivityId);
      if (act) return act;
    }
    if (commonActivityId) {
      for (const day of schedule) {
        for (const block of day.blocks) {
          const act = block.activities.find((a) => a.id === commonActivityId);
          if (act) return act;
        }
      }
    }
    if (selectedActivityId) {
      for (const day of schedule) {
        for (const block of day.blocks) {
          const act = block.activities.find((a) => a.id === selectedActivityId);
          if (act) return act;
        }
      }
    }
    return null;
  }, [selectedActivityId, commonActivityId, blockAssignments, schedule]);

  // KPI computations
  const { unassignedBlockCount, overCapacityCount } = useMemo(() => {
    let unassigned = 0;
    let overCapacity = 0;

    for (const day of schedule) {
      for (const block of day.blocks) {
        if (block.type !== "parallel") continue;
        const totalSignups = block.activities.reduce((sum, a) => sum + a.signup_count, 0);
        if (totalSignups < totalConfirmedParticipants) unassigned++;

        for (const act of block.activities) {
          if (act.max_participants != null && act.signup_count > act.max_participants) {
            overCapacity++;
          }
        }
      }
    }

    return { unassignedBlockCount: unassigned, overCapacityCount: overCapacity };
  }, [schedule, totalConfirmedParticipants]);

  const totalIncidents = unassignedBlockCount + overCapacityCount;

  const refreshAssignments = useCallback(
    async (blockId: string) => {
      const data = await getBlockAssignments(blockId, eventId);
      setBlockAssignments(data);
      // Also update signup_count + fields in schedule state
      setSchedule((prev) =>
        prev.map((day) => ({
          ...day,
          blocks: day.blocks.map((block) => {
            if (block.id !== blockId) return block;
            return {
              ...block,
              activities: block.activities.map((act) => {
                const match = data.activities.find((a) => a.id === act.id);
                return match
                  ? {
                      ...act,
                      signup_count: match.assigned.length,
                      max_participants: match.max_participants,
                      closed: match.closed,
                      title: match.title,
                      description: match.description,
                    }
                  : act;
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
      // Close incidents panel
      setShowIncidentsPanel(false);

      const block = currentDay?.blocks.find((b) => b.id === blockId);
      if (!block) return;

      // Common block — open detail panel only (no sidebar)
      if (block.type === "common") {
        // Toggle off if same activity
        if (commonActivityId === activityId) {
          setCommonActivityId(null);
          return;
        }
        // Close parallel mode if active
        setSelectedBlockId(null);
        setSelectedActivityId(null);
        setBlockAssignments(null);

        setCommonActivityId(activityId);
        return;
      }

      // Parallel block
      setCommonActivityId(null);
      setSelectedActivityId(activityId);

      if (blockId !== selectedBlockId) {
        setSelectedBlockId(blockId);
        await refreshAssignments(blockId);
      }
    },
    [currentDay, selectedBlockId, commonActivityId, refreshAssignments]
  );

  const handleClosePanel = useCallback(() => {
    setSelectedBlockId(null);
    setSelectedActivityId(null);
    setBlockAssignments(null);
    setCommonActivityId(null);
    setShowIncidentsPanel(false);
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
        await refreshAssignments(selectedBlockId);
      }
    },
    [selectedBlockId, blockAssignments, eventId, refreshAssignments]
  );

  const handleUnassign = useCallback(
    async (eventPersonId: string) => {
      if (!selectedBlockId || !selectedActivityId || !blockAssignments) return;

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

      if (!overId.startsWith("activity-")) return;
      const targetActivityId = overId.replace("activity-", "");

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

  const handleSidebarPersonClick = useCallback(
    (eventPersonId: string) => {
      if (selectedActivityId) {
        handleAssign(selectedActivityId, eventPersonId);
      }
    },
    [selectedActivityId, handleAssign]
  );

  const handleUpdateActivity = useCallback(
    async (
      activityId: string,
      data: {
        title?: string;
        description?: string | null;
        max_participants?: number | null;
        closed?: boolean;
      }
    ) => {
      await updateActivityField(activityId, eventId, data);
      setSchedule((prev) =>
        prev.map((day) => ({
          ...day,
          blocks: day.blocks.map((block) => ({
            ...block,
            activities: block.activities.map((act) =>
              act.id === activityId ? { ...act, ...data } : act
            ),
          })),
        }))
      );
      // Also update in blockAssignments if open
      if (blockAssignments) {
        setBlockAssignments((prev) =>
          prev
            ? {
                ...prev,
                activities: prev.activities.map((a) =>
                  a.id === activityId ? { ...a, ...data } : a
                ),
              }
            : prev
        );
      }
    },
    [eventId, blockAssignments]
  );

  // Standard schedule handlers
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
            time_label: block.time_label,
            activities: block.activities.map((a) => ({
              id: a.id,
              title: a.title,
              description: a.description,
              position: a.position,
              signup_count: a._count.signups,
              max_participants: a.max_participants,
              closed: a.closed,
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

  const handleUpdateBlock = useCallback(
    async (blockId: string, data: { time_label?: string | null }) => {
      await updateBlockField(blockId, eventId, data);
      setSchedule((prev) =>
        prev.map((day) => ({
          ...day,
          blocks: day.blocks.map((block) =>
            block.id === blockId ? { ...block, ...data } : block
          ),
        }))
      );
    },
    [eventId]
  );

  const handleDeleteActivity = useCallback(
    async (activityId: string) => {
      if (activityId === selectedActivityId || activityId === commonActivityId) handleClosePanel();
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
    [eventId, selectedDay, selectedActivityId, commonActivityId, handleClosePanel]
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
                    position: activity.position,
                    signup_count: activity._count.signups,
                    max_participants: activity.max_participants,
                    closed: activity.closed,
                  },
                ],
              }
            : block
        );
        updated[selectedDay] = day;
        return updated;
      });
      if (blockId === selectedBlockId) {
        await refreshAssignments(blockId);
      }
    },
    [eventId, selectedDay, selectedBlockId, refreshAssignments]
  );

  const handleToggleIncidents = useCallback(() => {
    const willShow = !showIncidentsPanel;
    if (willShow) {
      // Close other panels
      setSelectedBlockId(null);
      setSelectedActivityId(null);
      setBlockAssignments(null);
      setCommonActivityId(null);
    }
    setShowIncidentsPanel(willShow);
  }, [showIncidentsPanel]);

  const handleConfirmSchedule = useCallback(async () => {
    await confirmScheduleAction(eventId);
    setScheduleConfirmed(true);
  }, [eventId]);

  const handleIncidentClick = useCallback(
    (dayIndex: number, activityId: string, blockId: string) => {
      setShowIncidentsPanel(false);
      setSelectedDay(dayIndex);
      // Use setTimeout to let the day change render first
      setTimeout(() => {
        handleActivityClick(activityId, blockId);
      }, 0);
    },
    [handleActivityClick]
  );

  if (!currentDay) return null;

  const activeActivityId = selectedActivityId || commonActivityId;
  const showDetailPanel = !!currentActivityData && (!!activeActivityId);
  const showSidebar = isAssignmentMode;
  const showIncidents = showIncidentsPanel;
  const showRightPanel = showDetailPanel || showIncidents;

  const scheduleContent = (
    <>
      <ScheduleHeader
        eventId={eventId}
        eventName={eventName}
        dateStart={dateStart}
        dateEnd={dateEnd}
        unassignedBlockCount={unassignedBlockCount}
        overCapacityCount={overCapacityCount}
        scheduleConfirmed={scheduleConfirmed}
        onIncidentsClick={handleToggleIncidents}
        onConfirmSchedule={handleConfirmSchedule}
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

  // Right panel content
  const rightPanel = showIncidents ? (
    <ScheduleIncidentsPanel
      schedule={schedule}
      totalConfirmedParticipants={totalConfirmedParticipants}
      onClose={() => setShowIncidentsPanel(false)}
      onItemClick={handleIncidentClick}
    />
  ) : showDetailPanel && currentActivityData ? (
    <ActivityDetailPanel
      activity={currentActivityData}
      assigned={isAssignmentMode ? currentActivityAssigned : undefined}
      showAssigned={isAssignmentMode}
      isParallel={!commonActivityId}
      onUpdate={handleUpdateActivity}
      onUnassign={isAssignmentMode ? handleUnassign : undefined}
      onClose={handleClosePanel}
    />
  ) : null;

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
              onUpdateBlock={handleUpdateBlock}
              onDeleteActivity={handleDeleteActivity}
              onAddActivity={handleAddActivity}
              onAddBlock={handleAddBlock}
              onActivityClick={handleActivityClick}
              selectedActivityId={selectedActivityId ?? undefined}
              isAssignmentMode
            />
          </div>
          {rightPanel}
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
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 overflow-y-auto px-6 py-4 ${showRightPanel ? "" : ""}`}>
          <div className={`mx-auto w-full ${showRightPanel ? "" : "max-w-4xl"}`}>
            <DayColumn
              day={currentDay}
              onMoveBlock={handleMoveBlock}
              onDeleteBlock={handleDeleteBlock}
              onUpdateBlock={handleUpdateBlock}
              onDeleteActivity={handleDeleteActivity}
              onAddActivity={handleAddActivity}
              onAddBlock={handleAddBlock}
              onActivityClick={handleActivityClick}
              selectedActivityId={activeActivityId ?? undefined}
            />
          </div>
        </div>
        {rightPanel}
      </div>
    </>
  );
}
