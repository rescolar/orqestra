# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Orqestra** is an operational board tool for organizing retreat accommodations (30–100+ people). It replaces Excel with a visual drag-and-drop interface for room assignment. Desktop-first. The dominant UX emotion is **Control and Clarity**.

This project is in **pre-implementation phase** — only product documentation and static HTML/CSS mockups exist. No application code, build system, or tests have been written yet.

## Tech Stack

Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + PostgreSQL (Supabase) + NextAuth.js + dnd-kit. Deploy: Vercel + Supabase. Full details in `docs/delivery/07_stack-and-rollout.md`.

## Documentation Structure

- `docs/product/` — Product requirements (Spanish)
  - `00_product-main.md` — **Master requirements doc** (MVP vs FUTURE tagged). Start here.
  - `00_product-brief.md` — Problem statement and scope
  - `01_screen-map.md` — Screen/navigation map
  - `02_interactions.md` — Interaction patterns (legacy, basic)
  - `03_domain-model.md` — Domain entities, derived state, drop rules, pre-assignment rules (English)
  - `04_acceptance-criteria.md` — Acceptance criteria
  - `05_ui-interactions.md` — **Detailed UI/UX**: panel behaviors, drag & drop rules, reactive state propagation, undo
  - `06_navigation-flows.md` — **Navigation flows**: login, dashboard, event creation wizard, venue management, person directory
- `docs/delivery/` — Epic definitions and delivery planning
- `docs/ui/` — Static HTML/CSS mockups (board, pendings panel, add-participants modal, shared styles)

## Domain Model (summary — full spec in `03_domain-model.md`)

### Entity Hierarchy
```
User → Person (contact directory, reusable)
     → [FUTURE] Venue → VenueRoom (template)
     → Amenity (shared catalog)
     → Event → EventPerson (Person instance in event, with role/status/assignment)
             → Room (auto-generated or manual)
             → Group, UndoEntry
```

### User-level Entities
- **User** → authenticated account (role: user | superadmin), owns everything
- **Person** → contact directory (students, collaborators). Reusable across events. Stores identity (name, gender, contact), default_role, stable dietary/allergy data. Created explicitly or on-the-fly when adding to an event
- **[FUTURE] Venue** → reusable physical location with predefined room layout + venue-level amenities
- **[FUTURE] VenueRoom** → template room in a Venue
- **Amenity** (user-scoped catalog) → code, label, icon. Assignable at Room level (MVP). [FUTURE: 3 levels Venue/VenueRoom/Room]

### Event-scoped Entities
- **Event** → belongs to one User, optionally linked to a Venue
- **EventPerson** → instance of a Person in an event. Holds event-scoped state: role, status, group, dietary/preferences/allergies (copied from Person, editable per event), room_id. Identity fields (name, gender, contact) read from linked Person
- **Room** → copied from VenueRoom or created ad-hoc. All assignment/conflict state lives here
- **Group** → name, type (strong/flexible), locked (frozen), member_ids (→ EventPerson)
- **UndoEntry** → only two types: assign_person, link_persons. Uses batch_id for compound actions. Session-scoped

### Key Rules
- **Drop constraints**: role↔room_type mismatch is hard block, gender restriction is hard block, capacity overflow is allowed (creates conflict)
- **Pre-assignment**: only participants (never facilitators), respects locked rooms and frozen groups, priority: strong groups > flexible > women > men > tentative
- **Pending resolution**: toggles in the Pendings panel trigger reactive updates across ALL views (header KPIs, room cards, person chips, left column)

## Application Layout

Single view: Board. Three-column layout (left 264px / center flex / right 384px). The right panel is **contextual** — shows one of three views:

1. **Person detail** — opens on person click. Role toggle, status, gender, contact, group, dietary, preferences, allergies, discard
2. **Room detail** — opens on room card click. Editable name/code, capacity, assigned persons list, description, tags, amenities
3. **Pendings panel** — opens on header "Pendientes: N" click. Inline toggles to resolve each pending item directly. See `05_ui-interactions.md` for full detail

## Design System

Two mockup generations exist:
1. `docs/ui/styles.css` — Original (Fraunces + Space Grotesk, earthy green palette)
2. Newer Tailwind-based mockups (Material Symbols, primary #1E4A4A teal)

Key tokens: primary #1E4A4A, success #10B981, warning #F59E0B, danger #EF4444, accent #3B82F6. Cards rounded-2xl with 1px top color bar.

## Language Conventions

- **Code**: English (identifiers, comments, commit messages)
- **Domain model** (`03_domain-model.md`): English
- **Product docs** (`docs/product/`, `docs/delivery/`): Spanish
- **Example/seed data**: Spanish (person names, room names, preference texts, allergy texts, UI copy)
- **CLAUDE.md**: English
