# Architecture

---

## 1. Overview

Orqestra is a Next.js 15 monolith (App Router). No separate API server, no microservices. The frontend and backend live in the same project and deploy as a single unit to Vercel.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│  ┌───────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │ Left 264px│  │ Center (flex)    │  │ Right 384px       │ │
│  │ Persons   │  │ Room grid        │  │ Person / Room /   │ │
│  │ Search    │  │ Drag targets     │  │ Pendings panel    │ │
│  │ Unassigned│  │                  │  │ (one at a time)   │ │
│  └───────────┘  └──────────────────┘  └───────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Client State (Zustand)                                  │ │
│  │ Optimistic updates + rollback                           │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Next.js Server (Vercel)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │ Server       │  │ Services     │  │ Prisma ORM        │ │
│  │ Actions      │→ │ (business    │→ │ (type-safe        │ │
│  │ (thin layer) │  │  logic)      │  │  queries)         │ │
│  └──────────────┘  └──────────────┘  └───────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase)                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Three-layer architecture

All server-side code follows three strict layers. No exceptions.

### Layer 1: Server Actions (`lib/actions/`)

Thin transport layer. Each action does exactly 4 things:

1. **Authenticate** — check session
2. **Validate input** — parse and sanitize
3. **Delegate** — call the corresponding service
4. **Revalidate** — tell Next.js to refresh cached data

```typescript
// lib/actions/room.ts
"use server"

import { auth } from "@/lib/auth";
import { RoomService } from "@/lib/services/room.service";
import { revalidatePath } from "next/cache";

export async function assignPerson(eventPersonId: string, roomId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const result = await RoomService.assignPerson(
    eventPersonId,
    roomId,
    session.user.id
  );

  revalidatePath(`/events/${result.eventId}/board`);
  return result;
}
```

**Rules:**
- No business logic in actions — ever
- No direct Prisma calls
- One file per domain: `room.ts`, `event.ts`, `person.ts`, `group.ts`

### Layer 2: Services (`lib/services/`)

All business logic lives here. Services are pure functions that receive data and return results. They don't know about React, HTTP, or Next.js.

```typescript
// lib/services/room.service.ts

import { db } from "@/lib/db";

export const RoomService = {
  async assignPerson(eventPersonId: string, roomId: string, userId: string) {
    // 1. Verify the user owns this event
    const eventPerson = await db.eventPerson.findUniqueOrThrow({
      where: { id: eventPersonId },
      include: { event: true, person: true },
    });
    if (eventPerson.event.user_id !== userId) throw new Error("Forbidden");

    // 2. Load target room
    const room = await db.room.findUniqueOrThrow({
      where: { id: roomId },
      include: { event_persons: { include: { person: true } } },
    });

    // 3. Check drop rules
    if (room.locked) throw new Error("Room is locked");
    if (room.gender_restriction !== "mixed") {
      // validate gender compatibility
    }

    // 4. Create undo entry
    await db.undoEntry.create({
      data: {
        event_id: eventPerson.event_id,
        batch_id: crypto.randomUUID(),
        type: "assign_person",
        snapshot: {
          event_person_id: eventPersonId,
          previous_room_id: eventPerson.room_id,
          new_room_id: roomId,
        },
      },
    });

    // 5. Perform assignment
    const updated = await db.eventPerson.update({
      where: { id: eventPersonId },
      data: { room_id: roomId },
    });

    // 6. Detect new conflicts (capacity exceeded)
    const newCount = room.event_persons.length + 1;
    if (newCount > room.capacity) {
      await db.room.update({
        where: { id: roomId },
        data: { conflict_acknowledged: false },
      });
    }

    return { eventId: eventPerson.event_id, eventPerson: updated };
  },
};
```

**Rules:**
- All Prisma calls happen here (or in dedicated repository helpers if queries get complex)
- All validation, authorization, and conflict detection happen here
- Services are independently testable — no React dependencies
- One file per domain: `room.service.ts`, `event.service.ts`, `person.service.ts`, `group.service.ts`

### Layer 3: Prisma (`lib/db.ts`)

Singleton Prisma client. No logic — just the connection.

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

### Why this works for growth

Adding a new entity (e.g., Venue) is mechanical:

1. Add model to `schema.prisma`
2. Create `lib/services/venue.service.ts` — business logic
3. Create `lib/actions/venue.ts` — thin server actions
4. Create components that call the actions

No refactoring of existing code. No spaghetti. Each domain is isolated.

### Why no REST API (and when to add one)

Server Actions give us the same structure as REST without the ceremony:

| With REST API | With Server Actions |
|---|---|
| `POST /api/rooms/assign` → controller → service → Prisma | `assignPerson()` → service → Prisma |
| Need to serialize/deserialize JSON | TypeScript end-to-end, no serialization |
| Need route files, method handling, CORS | Just export async functions |
| Need API client on frontend | Just import and call |

**When to add a REST API:**
- Mobile app needs access (→ wrap services in route handlers)
- Third-party integrations need webhooks
- Public API for venue partners

The migration is trivial: create `app/api/rooms/assign/route.ts`, import the same service, done. Zero logic rewrite.

---

## 3. Client state and view consistency

### The problem

When the organizer drags a person to a room, these views must ALL update simultaneously:

- Room card (person count, status bar color, capacity badge)
- Source room card (if moving between rooms)
- Left column (unassigned count, person list)
- Header KPIs (assigned/unassigned/pending counts)
- Right panel (if open on that person or room)

### The solution: Zustand + Server revalidation

```
User drags person to Room 04
         │
         ▼
┌─ Client (Zustand) ──────────────┐
│ 1. Optimistic update:           │
│    - Add person to Room 04      │
│    - Remove from source/pool    │
│    - Recalculate all KPIs       │
│    - UI updates INSTANTLY       │
│                                 │
│ 2. Call Server Action (async)   │
└─────────────┬───────────────────┘
              │
              ▼
┌─ Server ────────────────────────┐
│ 3. Service validates & persists │
│ 4. revalidatePath() refreshes   │
│    server components            │
└─────────────┬───────────────────┘
              │
              ▼
┌─ Result ────────────────────────┐
│ OK  → Server data confirms      │
│       client state. No flicker. │
│                                 │
│ ERR → Zustand rolls back to     │
│       previous state.           │
│       Toast: "No se pudo asignar│
│       — habitación cerrada"     │
└─────────────────────────────────┘
```

### Zustand store structure

One store for the entire board, organized by domain:

```typescript
// stores/board.store.ts

interface BoardState {
  // Data
  rooms: Room[];
  eventPersons: EventPerson[];
  groups: Group[];
  undoStack: string[];  // batch_ids for undo

  // Derived (computed on state change)
  unassignedPersons: EventPerson[];
  kpis: {
    total: number;
    assigned: number;
    unassigned: number;
    pending: number;
  };

  // Actions
  assignPerson: (personId: string, roomId: string) => Promise<void>;
  unassignPerson: (personId: string) => Promise<void>;
  movePerson: (personId: string, fromRoomId: string, toRoomId: string) => Promise<void>;
  undo: () => Promise<void>;

  // Hydration
  hydrate: (data: BoardData) => void;
}
```

**Rules:**
- All components read from the store — never from props drilling
- All mutations go through store actions — never direct Server Action calls from components
- Store actions handle optimistic update → server call → rollback on error
- KPIs and derived state are computed selectors, not stored separately

---

## 4. Save strategy

### Principle: the action IS the save

No "Save" button anywhere in the application. Every interaction persists automatically.

| Interaction | When it saves | Mechanism |
|---|---|---|
| **Drag & drop** (assign person) | On drop | Immediate Server Action + optimistic update |
| **Toggle** (confirm tentative, mark notified) | On click | Immediate Server Action |
| **Text fields** (room name, description, requests) | On blur | Server Action on blur, debounced 500ms fallback |
| **Numeric fields** (capacity) | On blur | Server Action on blur |
| **Dropdowns** (gender restriction) | On change | Immediate Server Action |
| **Wizard steps** (create event) | On "Next" click | Server Action per step (not at the end) |

### Auto-save implementation pattern

```typescript
// hooks/useAutoSave.ts

function useAutoSave<T>(
  value: T,
  serverAction: (value: T) => Promise<void>,
  options?: { debounceMs?: number }
) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timeoutRef = useRef<NodeJS.Timeout>();

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      await serverAction(value);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }, [value, serverAction]);

  // On blur: save immediately
  const onBlur = useCallback(() => {
    clearTimeout(timeoutRef.current);
    save();
  }, [save]);

  // Debounce fallback (if user keeps typing without leaving field)
  useEffect(() => {
    if (options?.debounceMs) {
      timeoutRef.current = setTimeout(save, options.debounceMs);
      return () => clearTimeout(timeoutRef.current);
    }
  }, [value, save, options?.debounceMs]);

  return { status, onBlur };
}
```

### Visual feedback

Subtle, non-invasive indicators:

| Status | Visual |
|---|---|
| Editing | Field border: primary color |
| Saving | Small spinner or "Guardando..." text next to field |
| Saved | Green checkmark, fades after 1.5s |
| Error | Red border + tooltip with error message |

No modals, no toast stacks, no blocking UI. The organizer works fluidly.

---

## 5. Authentication flow

```
/register → name + email + password
         → User created (role: organizer)
         → auto-login (JWT cookie)
         → redirect /dashboard

/login → email + password
      → JWT cookie set
      → redirect /dashboard

Middleware → all routes except /login, /register, /api/auth/*
          → no valid JWT → redirect /login
```

- **Strategy:** JWT sessions (stateless, no Session table)
- **Provider:** Credentials (email + password with bcrypt)
- **Storage:** Encrypted cookie (managed by NextAuth)
- **Roles:** organizer (default) | admin (Orqestra staff)
- **Future:** OAuth providers (Google), participant access, venue manager access

---

## 6. Project structure (updated)

```
orqestra/
├── src/
│   ├── app/                        # App Router
│   │   ├── (auth)/                 # Login, register (no sidebar)
│   │   ├── dashboard/              # Post-login event list
│   │   ├── events/
│   │   │   ├── new/                # Event creation wizard
│   │   │   └── [id]/board/         # Main board view
│   │   └── api/auth/[...nextauth]/ # NextAuth handlers
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── board/                  # Room grid, room cards
│   │   ├── panels/                 # Right-side detail panels
│   │   └── layout/                 # Header, left column
│   ├── lib/
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── auth.ts                 # NextAuth config
│   │   ├── actions/                # Server Actions (thin layer)
│   │   │   ├── auth.ts
│   │   │   ├── event.ts
│   │   │   ├── room.ts
│   │   │   ├── person.ts
│   │   │   └── group.ts
│   │   └── services/               # Business logic (thick layer)
│   │       ├── event.service.ts
│   │       ├── room.service.ts
│   │       ├── person.service.ts
│   │       ├── group.service.ts
│   │       └── preassign.service.ts
│   ├── stores/                     # Zustand stores
│   │   └── board.store.ts
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAutoSave.ts
│   │   └── useBoardStore.ts
│   └── types/                      # Domain TypeScript types
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── docs/
```

---

## 7. Key architectural decisions

| Decision | Choice | Rationale |
|---|---|---|
| API layer | Server Actions (no REST) | Same structure, less ceremony. Services are reusable if REST needed later |
| Business logic | `lib/services/` layer | Testable, isolated, independent of React. One file per domain |
| Client state | Zustand | Lightweight, supports optimistic updates and derived state. Better than Context for complex state |
| View consistency | Optimistic updates + revalidatePath | Instant UI via Zustand, truth-of-record from server |
| Save strategy | Auto-save always | D&D and toggles: immediate. Text: on blur. Wizard: per step. No "Save" button |
| Auth | NextAuth JWT + Credentials | Stateless, no session table. Extensible to OAuth |
| Undo | Session-scoped UndoEntry | batch_id groups compound actions. Ctrl+Z pops latest batch |
