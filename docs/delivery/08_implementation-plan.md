# Plan de Implementación MVP

Orden de ejecución para construir Orqestra desde cero. Cada epic es desplegable de forma independiente.

**Documentos de referencia:**
- Modelo de datos MVP: `data-model-mvp.mmd`
- Modelo de datos futuro: `data-model-future.mmd`
- Arquitectura: `09_architecture.md`
- Modelo de dominio: `docs/product/03_domain-model.md`
- UI/UX detallado: `docs/product/05_ui-interactions.md`
- Flujos de navegación: `docs/product/06_navigation-flows.md`

---

## Epic 0 — Scaffolding y setup ✅ COMPLETADO

**Objetivo:** Proyecto arrancable en local con base de datos y auth funcionando.

### 0.1 Inicializar proyecto
- `pnpm create next-app@latest` con App Router, TypeScript, Tailwind, ESLint
- Instalar dependencias: `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`
- Inicializar Prisma: `pnpm prisma init`
- Configurar `shadcn/ui` (button, card, input, dialog, badge, dropdown-menu, separator)
- Añadir Material Symbols Outlined (Google Fonts link)
- Configurar tokens del design system en `tailwind.config.ts` (primary #1E4A4A, success, warning, danger)

### 0.2 Schema Prisma (base)
- Modelos: User, Person, Event, EventPerson, Room, Group, UndoEntry
- Seed: usuario demo para desarrollo

### 0.3 Autenticación
- NextAuth con CredentialsProvider (email + contraseña)
- Páginas: `/login`, `/register`
- Middleware: proteger todas las rutas excepto `/login` y `/register`
- Hash de contraseñas con bcrypt
- Redirect post-login → `/dashboard`

### 0.4 Configuración dev
- `.env.example` con todas las variables
- `docker-compose.yml` para PostgreSQL local
- `.gitignore` (node_modules, .env*, .next)
- Verificar: `pnpm dev` → login → dashboard vacío

**Criterio de éxito:** Un usuario puede registrarse, hacer login y ver un dashboard vacío.

---

## Epic 1 — Dashboard + Crear Evento

**Objetivo:** El usuario puede crear eventos y navegar a ellos.

### 1.1 Layout base
- Layout autenticado con header: logo "Orqestra" + nombre usuario + avatar
- Redirect `/` → `/dashboard`

### 1.2 Dashboard
- Page `/dashboard`
- Server Action: `getEvents(userId)` → lista de eventos (→ `lib/services/event.service.ts`)
- Grid de cards de eventos: nombre, fechas, badge "X/Y asignados"
- Card "+ Nuevo Evento" → abre dialog/modal

### 1.3 Crear evento
- Dialog con formulario: nombre, fecha inicio, fecha fin, nº participantes
- Server Action: `createEvent()` → delega a `EventService.create()` → crea evento + auto-genera rooms (plantilla "mostly doubles")
- Redirect a `/events/[id]/board`
- Patrón: Server Action (thin) → Service (business logic) → Prisma (ver `09_architecture.md`)

### 1.4 Plantilla "mostly doubles"
- Lógica: dado N participantes, generar habitaciones con capacidad 2 y has_private_bathroom = false
- Si N es impar, última habitación tiene capacidad 1 (o 3, a decidir)
- Nombres por defecto: "Hab 01", "Hab 02"...
- Todas las habitaciones son iguales — no hay distinción por tipo ni por rol

**Criterio de éxito:** Crear evento con 30 participantes → genera ~15 habitaciones → navega al board (vacío pero con rooms).

---

## Epic 2 — Board: Grid de Habitaciones

**Objetivo:** Visualizar habitaciones con su estado y capacidad.

### 2.1 Layout del Board
- Page `/events/[id]/board`
- Layout 3 columnas: izquierda 264px (vacía por ahora) | centro flex | derecha 384px (vacía por ahora)
- Header sticky: nombre evento + fechas + KPIs (0/0 asignados, N rooms, 0 pendientes)

### 2.2 Grid central
- Una sola sección de habitaciones (sin separación por tipo/rol)
- Room cards: barra color superior (6px), nombre + código, badge capacidad "0/Y", icono baño si has_private_bathroom
- Facilitadores visualmente distinguidos de participantes en las cards (diferente color/icono de chip)
- Placeholder dashed para slots vacíos
- Card "+ Nueva Habitación" (dashed)

### 2.3 Server Actions de rooms
- `createRoom(eventId, data)` → `RoomService.create()` — crear habitación
- `updateRoom(roomId, data)` → `RoomService.update()` — editar (nombre, código, capacidad, has_private_bathroom, género)
- `deleteRoom(roomId)` → `RoomService.delete()` — eliminar
- Patrón: Action → Service → Prisma (ver `09_architecture.md`)

### 2.4 Room status derivado
- ok: llena sin conflictos (assigned_count == capacity)
- warn: tiene disponibilidad (assigned_count < capacity) o tiene tentatives
- danger: capacidad excedida (assigned_count > capacity) o restricción de género violada
- closed: locked == true
- Barra de color refleja el status

**Criterio de éxito:** Board muestra grid de habitaciones con colores de estado correctos. Se pueden crear/editar/eliminar rooms.

---

## Epic 3 — Personas: Columna Izquierda + Añadir

**Objetivo:** Añadir personas al evento y verlas en la columna izquierda.

### 3.1 Columna izquierda
- Buscador "Buscar personas..."
- Tabs: Todos | Participantes | Facilitadores
- Pool "No asignados (Participantes)" + "No asignados (Facilitadores)"
- Cada persona: avatar (iniciales), name_display, pill de rol

### 3.2 Modal "Añadir Participantes"
- Botón "Añadir lista" → abre modal
- Textarea para pegar nombres (uno por línea)
- Preview de chips antes de confirmar
- Server Action: `addPersonsToEvent(eventId, names[])` → `PersonService.addBatch()` → crea Person (si no existe) + EventPerson (copia dietary/allergies de Person)
- Opción marcar como tentative

### 3.3 Person desde directorio
- Buscar en Person existentes del usuario
- Seleccionar uno o varios → crear EventPerson

### 3.4 KPIs del header
- Actualizar: total, asignados, no asignados, pendientes
- "No Asignados" clicable → scroll a la sección

**Criterio de éxito:** Pegar 30 nombres → aparecen en columna izquierda como no asignados → KPIs se actualizan.

---

## Epic 4 — Drag & Drop: Asignar Personas a Habitaciones

**Objetivo:** Arrastrar personas desde la columna izquierda a las room cards.

### 4.1 Setup dnd-kit
- DndContext wrapping el board
- Draggable: person chips (columna izquierda + dentro de rooms)
- Droppable: room cards

### 4.2 Drop rules
- Cualquier persona (participante o facilitador) → cualquier habitación: **permitido**
- Exceder capacidad: permitido (genera conflicto de tipo capacity_exceeded)
- Violación de género: **bloqueado** (persona.gender incompatible con room.gender_restriction)
- Room locked: **bloqueado** (debe desbloquearse primero)

### 4.3 Server Action + Optimistic updates
- `assignPerson(eventPersonId, roomId)` → `RoomService.assignPerson()` → actualiza room_id + crea UndoEntry
- `unassignPerson(eventPersonId)` → `RoomService.unassignPerson()` → room_id = null
- `movePerson(eventPersonId, fromRoomId, toRoomId)` → `RoomService.movePerson()` → reasignar
- Patrón optimistic update: Zustand actualiza UI inmediatamente → Server Action confirma o rollback (ver `09_architecture.md` §3)

### 4.4 Visual feedback
- Drag overlay (ghost del chip)
- Drop target highlight (verde = ok, rojo = bloqueado)
- Room card se actualiza: badge capacidad, barra color, persona aparece como fila

### 4.5 Undo básico
- Crear UndoEntry (type: assign_person) en cada asignación, con batch_id
- Botón Undo en header + Ctrl/Cmd+Z
- Revertir última asignación (pop del batch_id más reciente)

**Criterio de éxito:** Arrastrar persona a habitación → se asigna → KPIs actualizan → Undo revierte.

---

## Epic 5 — Panel Derecho: Detalles

**Objetivo:** Paneles contextuales para editar personas y habitaciones. Auto-save en cada cambio (ver `09_architecture.md` §4).

### 5.1 Panel de persona
- Click en persona (lista o chip en room) → abre panel derecho
- Toggle rol (participante/facilitador), estado (confirmado/tentative/cancelado), género
- Contacto (email, teléfono)
- Grupo (si pertenece a alguno)
- Dietary requirements (checkboxes: vegetarian, gluten_free, lactose_free)
- Allergies (textarea)
- Toggle "Notificado" (dietary_notified) — marca dieta+alergias como comunicados al venue/cocina
- Requests (textarea: requests_text) — peticiones específicas del evento
- Toggle "Gestionado" (requests_managed) — el organizador ha leído y gestionado la petición
- Auto-save: toggles=inmediato, text fields=on blur con debounce 500ms fallback

### 5.2 Panel de habitación
- Click en room card → abre panel derecho
- Nombre (display_name) y código (internal_number) editables
- Capacidad (input numérico)
- Has private bathroom (toggle)
- Gender restriction (dropdown: mixed/women/men)
- Lista de personas asignadas con botón desasignar
- Descripción (textarea), tags (pills)
- Lock toggle + locked_reason
- Auto-save: todos los campos on blur, toggles inmediatos

### 5.3 Exclusividad de paneles
- Solo un panel abierto a la vez (persona, habitación, o pendientes)
- Click en otra persona/room → reemplaza el panel actual
- Botón × para cerrar

**Criterio de éxito:** Click en persona → panel con datos editables + auto-save. Click en room → panel con detalles y has_private_bathroom toggle.

---

## Epic 6 — Pendientes y Estado Reactivo

**Objetivo:** Sistema de pendientes con 3 categorías y propagación reactiva a todas las vistas.

Referencia: `03_domain-model.md` §Pending, `09_architecture.md` §3 (Zustand + revalidation)

### 6.1 Tres tipos de pendientes

**Tipo 1: Conflictos de habitación** (resolver actuando en el board)
- Capacidad excedida (assigned_count > capacity) — se puede "acknowledge" (conflict_acknowledged = true, se oculta del panel pero el conflicto persiste). Se resetea si cambia la composición de la habitación
- Restricción de género violada — no se puede acknowledge, hay que mover a la persona
- Personas tentative (status == tentative) — confirmar o cancelar

**Tipo 2: Dieta y alergias** (resolver comunicando al venue)
- Personas con dietary_requirements[] no vacío O allergies_text existente, Y dietary_notified == false
- Resolución: exportar informe para cocina → marcar "Notificado" (sets dietary_notified = true para todos)
- Botón prominente "Exportar para cocina" en el panel

**Tipo 3: Peticiones** (resolver leyendo y decidiendo)
- Personas con requests_text existente Y requests_managed == false
- Resolución: el organizador lee, decide, marca "Gestionado" (sets requests_managed = true)

### 6.2 Panel de pendientes
- Click en "Pendientes: N" del header → abre panel derecho (reemplaza cualquier otro panel)
- Secciones: Conflictos de habitación > Dieta y alergias > Peticiones
- Conflictos: link a la habitación afectada, botón "Acknowledge" solo para capacidad excedida
- Dieta/alergias: contador de personas + botón "Exportar para cocina"
- Peticiones: lista con el texto de cada petición, toggle "Gestionado" inline
- Click en ítem → navega al panel de detalle correspondiente (persona o habitación)

### 6.3 Pending count
- `pending_count` = conflictos no acknowledged + personas con dieta/alergias no notificadas + personas con peticiones no gestionadas + personas tentative

### 6.4 Propagación reactiva
- Resolver pendiente → actualiza: header KPIs, room cards (barra, badges), person chips, lista izquierda
- Header verde cuando pending_count == 0
- Implementar con Zustand computed selectors (ver `09_architecture.md` §3)

**Criterio de éxito:** Pendientes se calculan en 3 categorías. Resolver uno actualiza todas las vistas inmediatamente. Header verde con 0 pendientes.

---

## Epic 7 — Grupos y Pre-asignación

**Objetivo:** Crear grupos (parejas, amigos) y pre-asignar automáticamente.

### 7.1 Grupos
- Crear grupo desde panel de persona o botón "+ Grupo"
- Tipos: strong (inseparable — si no caben juntos, se saltan) | flexible (se intenta, pero se pueden separar)
- Drag de miembro de grupo strong → popup "Mover solo / Mover grupo completo"
- UndoEntry type: link_persons para creación/modificación de grupos

### 7.2 Pre-asignación automática
- Botón "Pre-asignar" (visible si hay no asignados)
- Solo EventPersons con role == participant (nunca facilitadores)
- Workflow esperado: organizer asigna facilitadores manualmente → lock esas habitaciones → ejecuta pre-asignación para participantes
- Prioridad: strong groups > flexible groups > women > men > tentative
- Respeta: capacidad, restricción de género, locked rooms
- Se registra como batch en UndoEntry (batch_id compartido → un solo Undo revierte todo)

### 7.3 Facilitador con pareja
- Flag move_with_partner en EventPerson (solo relevante para facilitadores)
- Al arrastrar facilitador con move_with_partner → sugerir mover también a su pareja

**Criterio de éxito:** Pre-asignar 30 personas → se distribuyen respetando grupos y restricciones → un solo Undo revierte todo.

---

## Orden recomendado

```
Epic 0 (setup) ✅ ──→ Epic 1 (dashboard + crear) ──→ Epic 2 (grid rooms)
                                                        │
                                                        ▼
Epic 7 (grupos + pre-assign) ←── Epic 6 (pendientes) ←── Epic 5 (paneles) ←── Epic 4 (drag & drop) ←── Epic 3 (personas)
```

Cada epic es un milestone funcional. Al completar Epic 4 ya tienes un producto usable.
