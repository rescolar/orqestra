"use client";

import { Suspense } from "react";
import { NewEventForm } from "@/components/event/new-event-form";

export default function NewEventPage() {
  return (
    <Suspense>
      <NewEventForm />
    </Suspense>
  );
}
