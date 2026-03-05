"use client";

import { useState, useCallback } from "react";
import { DayTabs } from "@/components/schedule/day-tabs";
import { toggleActivitySignup } from "@/lib/actions/participant";
import type { ParticipantDaySchedule, ParticipantActivity } from "@/lib/services/schedule.service";

type ParticipantScheduleProps = {
  eventId: string;
  schedule: ParticipantDaySchedule[];
  scheduleConfirmed: boolean;
};

export function ParticipantSchedule({
  eventId,
  schedule: initialSchedule,
  scheduleConfirmed,
}: ParticipantScheduleProps) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [selectedDay, setSelectedDay] = useState(0);
  const [toggling, setToggling] = useState<string | null>(null);

  const currentDay = schedule[selectedDay] ?? schedule[0];

  const handleToggle = useCallback(
    async (activityId: string, blockId: string) => {
      setToggling(activityId);

      // Optimistic update
      setSchedule((prev) => {
        const updated = [...prev];
        const day = { ...updated[selectedDay] };
        day.blocks = day.blocks.map((block) => {
          if (block.id !== blockId) return block;
          return {
            ...block,
            activities: block.activities.map((act) => {
              if (act.id === activityId) {
                return {
                  ...act,
                  my_signup: !act.my_signup,
                  signup_count: act.my_signup
                    ? act.signup_count - 1
                    : act.signup_count + 1,
                };
              }
              // Deselect other activities in same block
              if (act.my_signup) {
                return {
                  ...act,
                  my_signup: false,
                  signup_count: act.signup_count - 1,
                };
              }
              return act;
            }),
          };
        });
        updated[selectedDay] = day;
        return updated;
      });

      await toggleActivitySignup(activityId, eventId);
      setToggling(null);
    },
    [eventId, selectedDay]
  );

  if (!currentDay) return null;

  return (
    <div className="space-y-4">
      <DayTabs
        days={schedule.map((d) => ({ day_index: d.day_index, date: d.date }))}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      <div className="space-y-4">
        {currentDay.blocks.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            No hay actividades programadas para este día.
          </p>
        )}

        {currentDay.blocks.map((block) => {
          if (block.type === "common") {
            const act = block.activities[0];
            return (
              <div key={block.id} className="rounded-2xl border-2 border-gray-200 bg-white p-4">
                <h3 className="font-semibold text-gray-900">{act.title}</h3>
                {block.time_label && (
                  <p className="mt-0.5 text-sm text-gray-500">
                    <span className="material-symbols-outlined mr-1 align-middle text-sm">
                      schedule
                    </span>
                    {block.time_label}
                  </p>
                )}
                {act.description && (
                  <p className="mt-2 text-sm text-gray-600">
                    {act.description}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={block.id}>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Elige una actividad
                </p>
                {block.time_label && (
                  <span className="text-xs text-gray-500">
                    <span className="material-symbols-outlined mr-0.5 align-middle text-sm">
                      schedule
                    </span>
                    {block.time_label}
                  </span>
                )}
              </div>
              <div
                className={`grid gap-3 ${
                  block.activities.length === 3 ? "grid-cols-3" : "grid-cols-2"
                }`}
              >
                {block.activities.map((act) => {
                  const isClosed = act.closed;
                  const isSignedUp = act.my_signup;

                  // Determine button text and style
                  let buttonText: React.ReactNode;
                  let buttonClass: string;

                  if (isClosed && !isSignedUp) {
                    buttonText = "Cerrada";
                    buttonClass = "bg-gray-100 text-gray-400 cursor-not-allowed";
                  } else if (scheduleConfirmed && isSignedUp) {
                    buttonText = (
                      <>
                        <span className="material-symbols-outlined mr-1 align-middle text-sm">
                          check_circle
                        </span>
                        Confirmado
                      </>
                    );
                    buttonClass = "bg-success text-white";
                  } else if (isSignedUp) {
                    buttonText = (
                      <>
                        <span className="material-symbols-outlined mr-1 align-middle text-sm">
                          schedule
                        </span>
                        En lista de espera
                      </>
                    );
                    buttonClass = "bg-amber-100 text-amber-700 hover:bg-amber-200";
                  } else {
                    buttonText = "Apuntarme";
                    buttonClass = "bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary";
                  }

                  return (
                    <div
                      key={act.id}
                      className={`flex min-h-[160px] flex-col rounded-2xl border-2 p-4 transition-colors ${
                        isClosed && !isSignedUp
                          ? "border-gray-200 bg-gray-50 opacity-60"
                          : isSignedUp
                          ? scheduleConfirmed
                            ? "border-success bg-success/5"
                            : "border-amber-300 bg-amber-50/50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-semibold text-gray-900">{act.title}</h3>
                        {isClosed && (
                          <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                            Cerrada
                          </span>
                        )}
                      </div>
                      {act.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {act.description}
                        </p>
                      )}
                      <div className="mt-auto pt-4">
                        <button
                          onClick={() => handleToggle(act.id, block.id)}
                          disabled={toggling === act.id || (isClosed && !isSignedUp)}
                          className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${buttonClass}`}
                        >
                          {buttonText}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
