# Domain Model (MVP)

## Entity Hierarchy

```
User
 ├── Person (contact directory, reusable across events)
 ├── [FUTURE] Venue (reusable across events)
 │    └── VenueRoom (template rooms)
 └── Event
      ├── EventPerson (instance of Person in this event, with role/status/assignment)
      ├── Room (capacity + has_private_bathroom, no type entity)
      └── Group
```

---

## User

The application is authenticated. Each user has an account and manages their own events.

- id
- email
- name
- avatar_url (optional)
- role: organizer | admin
- created_at

Ownership: **an Event belongs to exactly one User**. No shared ownership or multi-user permissions in MVP. Admin (Orqestra staff) has access to all users and events (admin panel, future scope).

## [FUTURE] Venue

A physical location (retreat center, hotel, rural accommodation) that contains a predefined room layout. Venues are reusable across events — the user can save a room configuration once and load it when creating a new event at the same location.

- id
- user_id (owner)
- name (e.g. "Casa Rural Sierra Norte", "Hotel Playa Mar")
- address (optional, free text)
- notes (optional, free text)
- venue_rooms[] (template rooms)

## [FUTURE] VenueRoom

Template room belonging to a Venue. When an Event uses a Venue, VenueRooms are **copied** into event-scoped Rooms. Changes to event Rooms do NOT propagate back to the Venue template.

- id
- venue_id
- internal_number (e.g. "Hab 01", "F-01")
- display_name (optional, emotional name: Luna, Sol, Bosque…)
- icon (optional, Material Symbol identifier)
- capacity (integer)
- has_private_bathroom (boolean)
- gender_restriction: mixed | women | men
- description (optional, free text)
- tags[] (free-form string tags)

## Event

- id
- user_id (owner — FK to User)
- venue_id (optional — FK to Venue, null if rooms created ad-hoc) [FUTURE: Venues]
- name
- date_start
- date_end
- estimated_participants (number, set at creation)
- status: draft | active | archived
- event_persons[] (FK to EventPerson)
- rooms[] (auto-generated on creation, editable from Board)
- groups[]

### Event creation (MVP)

Single-step form: name, dates, estimated_participants → auto-generate rooms (template "mostly doubles") → redirect to Board. Rooms are edited directly from the Board.

### [FUTURE] Event creation with Venues

1. **With existing Venue**: user selects a Venue → VenueRooms are copied as event Rooms. User can then modify rooms freely without affecting the Venue template.
2. **Without Venue (ad-hoc)**: user creates rooms manually. Can optionally **save the room layout as a new Venue** for future reuse.
3. **Save back to Venue**: update the Venue template with the current room layout (explicit action, not automatic).

---

## Person

User-scoped contact directory. Persons are the user's "address book" of students, collaborators, and contacts — reusable across events. A Person is NOT directly assigned to rooms; instead, an EventPerson instance is created for each event they participate in.

- id
- user_id (FK to User, owner)
- name_full (e.g. "José Luis Madrid Gómez")
- name_display (auto-generated: first name + first surname, e.g. "José Madrid")
- name_initials (auto-generated: e.g. "JM", used for avatar fallback)
- default_role: participant | facilitator (default role when adding to events, editable per event)
- gender: unknown | female | male | other
- contact_email (optional)
- contact_phone (optional)
- contact_address (optional)
- dietary_requirements[]: vegetarian | gluten_free | lactose_free (stable personal data, copied to EventPerson)
- allergies_text (optional, free text — stable personal data, copied to EventPerson)
- notes (optional, free text — internal notes about this person)
- created_at

Persons can be created:
1. **From the directory** — explicitly before any event
2. **On the fly during an event** — added via paste list or manual add, automatically saved to the directory for future reuse

## EventPerson

Instance of a Person participating in a specific Event. Contains all event-scoped state (role, status, assignment, preferences). Created when a Person is added to an Event.

- id
- event_id (FK to Event)
- person_id (FK to Person — links back to the directory entry)
- role: participant | facilitator (initialized from person.default_role, editable per event)
- status: confirmed | tentative | cancelled
- group_id (optional, event-scoped)
- move_with_partner (boolean, default false — when true and role is facilitator, suggest moving their partner too on drag)
- dietary_requirements[]: (copied from Person on creation, editable per event)
- allergies_text (copied from Person on creation, editable per event)
- dietary_notified (boolean, default false — "diet+allergies communicated to venue/kitchen")
- requests_text (optional, free text — event-specific requests: "can I bring a caravan?", "arriving late", etc.)
- requests_managed (boolean, default false — "organizer has read and handled this request")
- room_id (optional, null when unassigned)

Derived:
- name_full, name_display, name_initials, gender, contact_* → read from linked Person (single source of truth for identity)
- is_pending (true if tentative, or has diet/allergies not notified, or has unmanaged requests)

### Adding persons to an Event

1. **From directory**: user searches their Person directory, selects one or more persons → EventPerson instances created with data copied from Person
2. **Paste list** (modal): names are matched against existing directory entries (by name). Matches link to existing Person; new names create new Person entries in the directory AND EventPerson in the event
3. **Changes to EventPerson do NOT propagate back to Person** (same copy pattern as Venue → Room). Exception: identity fields (name, gender, contact) are always read from Person — if updated there, all EventPerson instances see the change

## [FUTURE] RoomType

Room classification entity (e.g. "Doble", "Suite", "Dormitorio") for PMS-oriented use cases. Not needed for MVP — facilitators think in terms of capacity + bathroom, not formal room types. Can be added later without breaking the model.

## Room

Event-scoped room. Created in batch during event wizard or manually from the Board. All assignment and conflict state lives here.

- id
- event_id (FK to Event)
- internal_number (e.g. "Hab 01", auto-generated on batch creation)
- display_name (optional, "emotional" name: Luna, Sol, Bosque, Cielo…)
- icon (optional, Material Symbol identifier, e.g. "dark_mode" for Luna)
- capacity (integer, free numeric input)
- has_private_bathroom (boolean, default false)
- gender_restriction: mixed | women | men
- description (optional, free text — location details, bed type, etc. e.g. "Cerca de los baños, cama litera, ventana al bosque")
- tags[] (free-form string tags, e.g. "Planta Baja", "Litera disponible")
- conflict_acknowledged (boolean, default false — when true, room conflicts still exist structurally but are hidden from pendings panel. Resets to false if a new conflict is introduced, e.g. a person is added/removed)
- locked (boolean, closed room — e.g. maintenance)
- locked_reason (optional, free text, e.g. "Habitación cerrada por mantenimiento")

Derived:
- assigned_event_persons[] (EventPersons with room_id == this room)
- assigned_count
- tentative_count
- available_slots (capacity - assigned_count)
- status: ok | warn | danger | closed
  - ok: assigned_count == capacity, no conflicts
  - warn: assigned_count < capacity (has availability), or has tentative event_persons
  - danger: capacity exceeded (assigned_count > capacity) or gender restriction violated
  - closed: locked == true
- conflict_flags[]: capacity_exceeded | gender_restriction_violated
- sort_key: alphabetical by display_name if present, else by internal_number

## [FUTURE] Amenity

Amenities beyond private bathroom (wifi, heating, parking, pool, etc.) can be added in a future iteration, potentially linked to a RoomType entity. For MVP, the only relevant room feature is `has_private_bathroom`, stored directly on Room.

## [FUTURE] Kitchen Report (meal planning)

The kitchen/diet export evolves from a simple PDF into a meal-planning wizard:

### Context
Retreats typically follow a pattern: arrival Friday dinner → departure Sunday after lunch. Each person has 3 meals/day. But not everyone attends every meal — some arrive late (miss Friday dinner) or leave early (miss Sunday lunch). This affects both kitchen efficiency (avoid food waste) and potentially pricing.

### Proposed flow
1. Event defines a **meal grid** based on date_start/date_end (auto-generated: Friday dinner, Saturday breakfast/lunch/dinner, Sunday breakfast/lunch)
2. Before exporting the kitchen report, organizer opens a **meal wizard** where they can toggle per-person which meals they attend (default: all meals)
3. The export generates a report per meal: count by diet type (None, V, SG, SL) for each meal slot
4. Optionally, missed meals can affect pricing (discount per missed meal)

### Entities (sketch)
```
MealSlot (event-scoped, auto-generated)
  - id, event_id, date, meal_type (breakfast | lunch | dinner)

EventPersonMeal (attendance per person per meal)
  - event_person_id, meal_slot_id, attending (boolean, default true)
```

### Kitchen report output (per meal)
| Meal | None | Vegetarian | Sin Gluten | Sin Lactosa | Total |
|------|------|-----------|------------|-------------|-------|
| Vie Cena | 28 | 5 | 2 | 1 | 36 |
| Sáb Desayuno | 30 | 6 | 2 | 1 | 39 |
| ... | | | | | |

## Group

- id
- event_id (FK to Event)
- name (e.g. "Pareja Nora + Ian")
- type: strong | flexible
- member_ids[] (FK to EventPerson)

Derived:
- size (member_ids.length)

## UndoEntry

Simplified undo model. Only two operation types are undoable — room assignments and group links. Everything else (status, role, room edits) is trivial to change manually and not worth the complexity.

- id
- event_id (FK to Event)
- batch_id (groups multiple entries into one undo step, e.g. pre-assign creates N assign_person entries sharing a batch_id)
- type: assign_person | link_persons
- snapshot (state before the action):
  - **assign_person**: { event_person_id, previous_room_id (null if unassigned), new_room_id }
  - **link_persons**: { group_id, previous_member_ids[] (empty if group was new), new_member_ids[], previous_group_type (null if new) }
- timestamp

Undo stack is session-scoped (not persisted across sessions). Ctrl/Cmd+Z pops the most recent batch_id and reverts all entries in that batch.

## Pending (derived, not stored)

Aggregated from multiple sources into a single counter and categorized list. Three distinct types of pendings, each with a different resolution mechanism.

### 1. Room conflicts (resolve by acting on the board)

These are structural problems — they resolve themselves when the organizer fixes the cause. No toggle needed.

| Conflict | Source | How it resolves |
|---|---|---|
| Capacity exceeded | room.assigned_count > room.capacity | Move someone out or increase capacity |
| Gender restriction violated | person.gender incompatible with room.gender_restriction | Move the person to a compatible room |
| Tentative persons | eventPerson.status == tentative | Confirm or cancel the person |

Room conflicts that the organizer acknowledges (capacity_exceeded only) can be dismissed via `room.conflict_acknowledged = true`. Gender violations cannot be acknowledged — they must be fixed.

### 2. Diet & allergies (resolve by communicating to venue)

Information that needs to be sent to the kitchen/venue. Not resolved in the app itself — resolved by exporting and sending.

| Source | Resolution |
|---|---|
| eventPerson.dietary_requirements[] non-empty OR eventPerson.allergies_text exists, AND dietary_notified == false | Export to PDF/Excel for kitchen → mark as "Notificado" (sets dietary_notified = true) |

All diet+allergies for an event are communicated together (one export action). The panel shows a count of persons with diet/allergy info and a prominent "Export for kitchen" button.

### 3. Requests (resolve by reading and deciding)

Free-text requests from participants that the organizer handles case by case.

| Source | Resolution |
|---|---|
| eventPerson.requests_text exists AND requests_managed == false | Organizer reads, decides, marks "Gestionado" (sets requests_managed = true) |

### Pending count

`pending_count` = room conflicts (unacknowledged) + persons with un-notified diet/allergies + persons with unmanaged requests + tentative persons

### Reactive state propagation

When any pending is resolved, ALL affected views update immediately:

- Header KPI `pending_count` decrements
- Room card: status bar color, conflict icon/text, tentative badge
- Left column: person chip tentative badge
- Person detail panel: toggles sync
- Header background turns green when pending_count == 0

The pendings panel stays open after resolving items — user closes it manually.

## Derived Global (Header KPIs)

- total_event_persons (excluding cancelled)
- assigned_count
- unassigned_count (total - assigned)
- room_count
- pending_count
- header_state: normal | all_clear (pending_count == 0 → green header)

## Drop Rules

Any EventPerson (participant or facilitator) can be dropped into any room. No role↔room restriction exists. The only hard constraints are:

| Constraint | Behavior |
|---|---|
| Gender restriction violated | Block (hard constraint) — e.g. dropping a male into a women-only room |
| Capacity exceeded | Allow (creates conflict — capacity_exceeded flag, shown as warning) |
| Room locked | Block (hard constraint) — room must be unlocked first |

Facilitators are visually distinguished from participants in room cards (different chip color/icon) so the organizer can see the room composition at a glance.

## Pre-assignment Rules

- Pre-assignment only places EventPersons with role == participant
- Facilitators are **never** auto-placed by pre-assignment — organizers assign them manually first, then lock those rooms, then run pre-assignment for participants
- Strong groups are placed together (mandatory) — if they don't fit anywhere together, they are skipped
- Flexible groups: algorithm tries to place together, but can split if needed
- Priority: strong groups > flexible groups > women > men > tentative
