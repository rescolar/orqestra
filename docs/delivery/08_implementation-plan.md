# Plan de Implementación MVP

Orden de ejecución para construir Orqestra desde cero. Cada epic es desplegable de forma independiente.

---

## Epic 0 — Scaffolding y setup (prerequisito)

**Objetivo:** Proyecto arrancable en local con base de datos y auth funcionando.

### 0.1 Inicializar proyecto
- `pnpm create next-app@latest` con App Router, TypeScript, Tailwind, ESLint
- Instalar dependencias: `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`
- Inicializar Prisma: `pnpm prisma init`
- Configurar `shadcn/ui` (button, card, input, dialog, badge, dropdown-menu, separator)
- Añadir Material Symbols Outlined (Google Fonts link)
- Configurar tokens del design system en `tailwind.config.ts` (primary #1E4A4A, success, warning, danger)

### 0.2 Schema Prisma (base)
- Modelos: User, Person, Event, EventPerson, Room, Amenity, Group
- Seed: amenities por defecto (wifi, heating, ac, kitchen, private_bathroom, parking, accessibility)
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
- Server Action: `getEvents(userId)` → lista de eventos
- Grid de cards de eventos: nombre, fechas, badge "X/Y asignados"
- Card "+ Nuevo Evento" → abre dialog/modal

### 1.3 Crear evento
- Dialog con formulario: nombre, fecha inicio, fecha fin, nº participantes
- Server Action: `createEvent()` → crea evento + auto-genera rooms (plantilla "mostly doubles") + crea amenities iniciales por room
- Redirect a `/events/[id]/board`

### 1.4 Plantilla "mostly doubles"
- Lógica: dado N participantes, generar habitaciones de capacidad 2 (ajustar última si N es impar)
- Nombres por defecto: "Hab 01", "Hab 02"... + 1 habitación facilitador "F-01"
- room_type: general para participantes, facilitator para facilitadores

**Criterio de éxito:** Crear evento con 30 participantes → genera ~16 habitaciones → navega al board (vacío pero con rooms).

---

## Epic 2 — Board: Grid de Habitaciones

**Objetivo:** Visualizar habitaciones con su estado y capacidad.

### 2.1 Layout del Board
- Page `/events/[id]/board`
- Layout 3 columnas: izquierda 264px (vacía por ahora) | centro flex | derecha 384px (vacía por ahora)
- Header sticky: nombre evento + fechas + KPIs (0/0 asignados, N rooms, 0 pendientes)

### 2.2 Grid central
- Dos secciones: "Habitaciones Participantes" (general) y "Habitaciones Facilitadores" (facilitator)
- Room cards: barra color superior (6px), nombre + código, badge capacidad "0/Y"
- Placeholder dashed para slots vacíos
- Card "+ Nueva Habitación" (dashed)

### 2.3 Server Actions de rooms
- `createRoom(eventId, data)` — crear habitación
- `updateRoom(roomId, data)` — editar (nombre, código, capacidad, tipo, género)
- `deleteRoom(roomId)` — eliminar

### 2.4 Room status derivado
- ok: llena sin conflictos
- warn: tiene disponibilidad o tiene tentatives
- danger: capacidad excedida o restricción violada
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
- Server Action: `addPersonsToEvent(eventId, names[])` → crea Person (si no existe) + EventPerson
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
- Participante → room general: permitido
- Participante → room facilitador: **bloqueado**
- Facilitador → room facilitador: permitido
- Facilitador → room general: **bloqueado**
- Exceder capacidad: permitido (genera conflicto)
- Violación de género: **bloqueado**

### 4.3 Server Action
- `assignPerson(eventPersonId, roomId)` → actualiza room_id
- `unassignPerson(eventPersonId)` → room_id = null
- `movePerson(eventPersonId, fromRoomId, toRoomId)` → reasignar

### 4.4 Visual feedback
- Drag overlay (ghost del chip)
- Drop target highlight (verde = ok, rojo = bloqueado)
- Room card se actualiza: badge capacidad, barra color, persona aparece como fila

### 4.5 Undo básico
- Crear UndoEntry en cada asignación
- Botón Undo en header + Ctrl/Cmd+Z
- Revertir última asignación

**Criterio de éxito:** Arrastrar persona a habitación → se asigna → KPIs actualizan → Undo revierte.

---

## Epic 5 — Panel Derecho: Detalles

**Objetivo:** Paneles contextuales para editar personas y habitaciones.

### 5.1 Panel de persona
- Click en persona (lista o chip en room) → abre panel derecho
- Toggle rol (participante/facilitador), estado (confirmado/tentative/cancelado), género
- Contacto (email, teléfono), grupo, dietary, preferencias, alergias
- Toggles "Gestionado" para dietary/preferencias/alergias
- Autosave en cada cambio

### 5.2 Panel de habitación
- Click en room card → abre panel derecho
- Nombre y código editables, capacidad (input numérico)
- Lista de personas asignadas con botón desasignar
- Descripción (textarea), tags (pills), amenities (checkboxes del catálogo)
- Botones Guardar / Descartar

### 5.3 Exclusividad de paneles
- Solo un panel abierto a la vez
- Click en otra persona/room → reemplaza el panel actual
- Botón × para cerrar

**Criterio de éxito:** Click en persona → panel con todos sus datos editables. Click en room → panel con detalles y amenities.

---

## Epic 6 — Pendientes y Estado Reactivo

**Objetivo:** Sistema de pendientes con resolución inline y propagación a todas las vistas.

### 6.1 Cálculo de pendientes
- Alergias/dietary no gestionados
- Conflictos de habitación (capacidad, género, rol)
- Personas tentative
- Preferencias no gestionadas

### 6.2 Panel de pendientes
- Click en "Pendientes: N" del header → abre panel derecho
- Secciones por prioridad: alergias > conflictos > tentatives > preferencias
- Cada ítem con toggle inline para resolver
- Click en ítem → navega al panel de detalle correspondiente

### 6.3 Propagación reactiva
- Resolver pendiente → actualiza: header KPIs, room cards (barra, badges), person chips, lista izquierda
- Header verde cuando pendientes == 0

### 6.4 Room conflict_acknowledged
- Toggle "Gestionado" en conflicto → conflict_acknowledged = true
- Se resetea si cambia la composición de la habitación

**Criterio de éxito:** Pendientes se calculan correctamente. Resolver uno actualiza todas las vistas inmediatamente. Header verde con 0 pendientes.

---

## Epic 7 — Grupos y Pre-asignación

**Objetivo:** Crear grupos (parejas, amigos) y pre-asignar automáticamente.

### 7.1 Grupos
- Crear grupo desde panel de persona o botón "+ Grupo"
- Tipos: strong (inseparable por defecto) | flexible
- Locked (frozen): la pre-asignación respeta el grupo
- Drag de miembro de grupo strong → popup "Mover solo / Mover grupo completo"

### 7.2 Pre-asignación automática
- Botón "Pre-asignar" (visible si hay no asignados)
- Solo participantes (nunca facilitadores)
- Prioridad: strong groups > flexible > women > men > tentative
- Respeta: capacidad, género, locked rooms, frozen groups
- Se registra como batch en UndoEntry (un solo Undo revierte todo)

### 7.3 Facilitador con pareja
- Flag move_with_partner en EventPerson
- Al arrastrar facilitador → sugerir mover también a su pareja

**Criterio de éxito:** Pre-asignar 30 personas → se distribuyen respetando grupos y restricciones → un solo Undo revierte todo.

---

## Orden recomendado

```
Epic 0 (setup) ──→ Epic 1 (dashboard + crear) ──→ Epic 2 (grid rooms)
                                                        │
                                                        ▼
Epic 7 (grupos + pre-assign) ←── Epic 6 (pendientes) ←── Epic 5 (paneles) ←── Epic 4 (drag & drop) ←── Epic 3 (personas)
```

Cada epic es un milestone funcional. Al completar Epic 4 ya tienes un producto usable.
