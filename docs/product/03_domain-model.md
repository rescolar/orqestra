# Domain Model (MVP)

## Entity Hierarchy

```
User
 ├── Person (contact directory, reusable across events)
 ├── [FUTURE] Venue (reusable across events)
 │    ├── venue.amenity_ids[] (venue-level: parking, pool, reception…)
 │    └── VenueRoom (template rooms)
 │         └── venueRoom.amenity_ids[] (room-level: wifi, heating…)
 ├── Amenity (catalog, user-scoped)
 └── Event
      ├── EventPerson (instance of Person in this event, with role/status/assignment)
      ├── Room (auto-generated or created manually from Board)
      │    └── room.amenity_ids[]
      └── Group
```

---

## User

The application is authenticated. Each user has an account and manages their own events.

- id
- email
- name
- avatar_url (optional)
- role: user | superadmin
- created_at

Ownership: **an Event belongs to exactly one User**. No shared ownership or multi-user permissions in MVP. Superadmin has access to all users and events (admin panel, future scope).

## [FUTURE] Venue

A physical location (retreat center, hotel, rural accommodation) that contains a predefined room layout. Venues are reusable across events — the user can save a room configuration once and load it when creating a new event at the same location.

- id
- user_id (owner)
- name (e.g. "Casa Rural Sierra Norte", "Hotel Playa Mar")
- address (optional, free text)
- notes (optional, free text)
- amenity_ids[] (venue-level amenities — shared by all rooms in this venue, e.g. parking, pool, 24h reception)
- venue_rooms[] (template rooms)

## [FUTURE] VenueRoom

Template room belonging to a Venue. When an Event uses a Venue, VenueRooms are **copied** into event-scoped Rooms. Changes to event Rooms do NOT propagate back to the Venue template.

- id
- venue_id
- internal_number (e.g. "Hab 01", "F-01")
- display_name (optional, emotional name: Luna, Sol, Bosque…)
- icon (optional, Material Symbol identifier)
- capacity (integer)
- room_type: general | facilitator
- gender_restriction: mixed | women | men
- description (optional, free text)
- tags[] (free-form string tags)
- amenity_ids[] (references to Amenity table)

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
- dietary_managed (boolean, event-scoped)
- preferences_text (optional, free text — event-specific)
- preferences_managed (boolean, event-scoped)
- allergies_text (copied from Person on creation, editable per event)
- allergies_managed (boolean, event-scoped)
- room_id (optional, null when unassigned)

Derived:
- name_full, name_display, name_initials, gender, contact_* → read from linked Person (single source of truth for identity)
- is_pending (true if tentative, or has unmanaged preferences, or has unmanaged allergies, or has unmanaged dietary)

### Adding persons to an Event

1. **From directory**: user searches their Person directory, selects one or more persons → EventPerson instances created with data copied from Person
2. **Paste list** (modal): names are matched against existing directory entries (by name). Matches link to existing Person; new names create new Person entries in the directory AND EventPerson in the event
3. **Changes to EventPerson do NOT propagate back to Person** (same copy pattern as Venue → Room). Exception: identity fields (name, gender, contact) are always read from Person — if updated there, all EventPerson instances see the change

## Room

Event-scoped room. Created by copying from VenueRoom or manually. All assignment and conflict state lives here.

- id
- event_id (FK to Event)
- source_venue_room_id (optional — FK to VenueRoom, tracks origin for reference but no live sync)
- internal_number (e.g. "Hab 01", "F-01" for facilitator rooms)
- display_name (optional, "emotional" name: Luna, Sol, Bosque, Cielo…)
- icon (optional, Material Symbol identifier, e.g. "dark_mode" for Luna)
- capacity (integer, editable via number input)
- room_type: general | facilitator
- gender_restriction: mixed | women | men
- description (optional, free text — location details, bed type, etc. e.g. "Cerca de los baños, cama litera, ventana al bosque")
- tags[] (free-form string tags, e.g. "Planta Baja", "Litera disponible")
- amenity_ids[] (references to Amenity table)
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
  - danger: capacity exceeded (assigned_count > capacity) or gender restriction violated or role mismatch
  - closed: locked == true
- conflict_flags[]: capacity_exceeded | gender_restriction_violated | role_mismatch
- sort_key: alphabetical by display_name if present, else by internal_number

## Amenity

Independent catalog table for room/venue equipment and features. User-scoped (shared across all Venues and Events of that user). Each amenity can be assigned at three levels:

| Level | Field | Example amenities | Semantics |
|---|---|---|---|
| **Venue** | venue.amenity_ids[] | Parking, Piscina, Recepción 24h | Shared by all rooms in the venue |
| **VenueRoom** | venueRoom.amenity_ids[] | Wi-Fi, Calefacción, Baño Privado | Specific to that room template |
| **Event Room** | room.amenity_ids[] | (effective set after copy + organizer edits) | What the organizer sees and modifies |

- id
- user_id (FK to User)
- code (unique per user, e.g. "wifi", "heating", "ac", "kitchen", "private_bathroom", "parking", "pool")
- label (display name, e.g. "Wi-Fi", "Calefacción", "Aire Acondicionado", "Cocina", "Baño Privado", "Parking", "Piscina")
- icon (optional, Material Symbol identifier)

The list is extensible — organizers can add custom amenities.

### Amenity inheritance on Event creation

When an Event is created from a Venue:
1. For each VenueRoom → create an event Room with `room.amenity_ids = venue.amenity_ids ∪ venueRoom.amenity_ids`
2. The organizer can then freely add/remove amenities on each event Room
3. Changes to event Room amenities do NOT propagate back to Venue or VenueRoom

### Default Amenities (seed data, created for each new User)

| code | label |
|---|---|
| wifi | Wi-Fi |
| heating | Calefacción |
| ac | Aire Acondicionado |
| kitchen | Cocina |
| private_bathroom | Baño Privado |
| parking | Parking |
| accessibility | Accesibilidad |

## Group

- id
- event_id (FK to Event)
- name (e.g. "Pareja Nora + Ian")
- type: strong | flexible
- locked (boolean, frozen — pre-assignment respects frozen groups)
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

Aggregated from multiple sources into a single counter and categorized list. Each pending item can be resolved **directly from the Pendings panel** via an inline toggle.

### Pending categories and resolution

| Category | Source | Toggle label | Resolution action | Side effects on toggle |
|---|---|---|---|---|
| Allergies & Dietary (high priority) | eventPerson.allergies_text exists AND allergies_managed == false, OR dietary_requirements non-empty AND dietary_managed == false | "Gestionado" | Sets allergies_managed = true or dietary_managed = true | EventPerson pending state updates |
| Room conflicts | room.conflict_flags non-empty (capacity_exceeded, gender_restriction_violated, role_mismatch) | "Gestionado" | Sets room.conflict_acknowledged = true | Room card bar/icon updates. Note: conflict is still structurally present — acknowledged just hides it from pendings |
| Tentative persons | eventPerson.status == tentative | "Confirmado" | Sets eventPerson.status = confirmed | Tentative badge removed from chips, room tentative_count decrements |
| Unresolved preferences | eventPerson.preferences_text exists AND preferences_managed == false | "Gestionado" | Sets preferences_managed = true | EventPerson pending state updates |

Priority order in pending panel: Allergies & Dietary > Conflicts > Tentative > Preferences

### Reactive state propagation

When any pending is resolved (via panel toggle OR via person/room detail panel), ALL affected views must update immediately:

- Header KPI `pending_count` decrements
- Room card: status bar color, conflict icon/text, tentative badge
- Left column: person chip tentative badge, unassigned list if status changed
- Person detail panel: managed/resolved toggles sync
- Header background turns green when pending_count == 0

The pendings panel stays open after resolving items — user closes it manually.

## Derived Global (Header KPIs)

- total_event_persons (excluding cancelled)
- assigned_count
- unassigned_count (total - assigned)
- room_count
- pending_count
- header_state: normal | all_clear (pending_count == 0 → green header)

## Drop Rules (Role × Room Type)

| EventPerson role | Target room_type | Behavior |
|---|---|---|
| participant | general | Allow |
| participant | facilitator | Block (hard constraint) |
| facilitator | facilitator | Allow |
| facilitator | general | Block (hard constraint) |

## Pre-assignment Rules

- Pre-assignment only places EventPersons with role == participant
- Facilitators are **never** auto-placed by pre-assignment (MVP phase 1)
- Facilitators must be assigned manually via drag & drop
