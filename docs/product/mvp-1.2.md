# MVP 1.2 — Multi-Rol, Co-Organizadores, Entornos Privados y Relaciones entre Participantes

> **Estado**: Roadmap / diseño conceptual. No es un plan de implementación inmediata.
> **Fecha**: 2026-03-08

---

## 0. Contexto y motivación

MVP 1.1 resuelve el caso de un organizador único con participantes que se auto-registran. Para escalar la plataforma se necesitan:

1. **Filtro de organizador en admin** — El admin puede seleccionar un organizador y gestionar su contenido.
2. **Co-organizadores** — Invitar colaboradores a gestionar un evento específico mediante enlace.
3. **Invitación de administradores** — Crear nuevos admins mediante enlace.
4. **Multi-rol** — Un admin puede participar en eventos; un organizador puede participar en eventos de otro organizador.
5. **Entornos privados vs abiertos** — Entornos corporativos/premium (privados) vs comunidades abiertas.
6. **Relaciones entre participantes** — Un participante puede invitar a su pareja/amigo al evento.
7. **Descubrimiento de participantes** — Ver otros inscritos (base para mensajería futura).

---

## 1. Decisión de diseño principal: User = Login, Person = Per-Organizador

### Principio

- **User** = identidad global mínima (email, name, password, google_id, role). Solo la llave de acceso.
- **Person** = ficha de datos per-organizador. Cada contexto organizador es un "mundo" independiente.
- **EventPerson** = datos por evento (rol, habitación, relaciones, peticiones, comidas).

### Justificación

Cada organizador necesita su propia ficha de una persona:
- Retiro de yoga: vegetariano, teléfono personal, dirección de casa.
- Empresa: omnívoro, teléfono corporativo, dirección de oficina.

No tiene sentido compartir datos entre contextos — especialmente en entornos privados donde la privacidad pesa. Además, evita problemas de GDPR: un cambio en un contexto no afecta a otro.

### Cambio sobre MVP 1.1

`Person.self_user_id` deja de ser `@unique`. Un User puede tener N registros Person (uno por organizador). Se añade constraint compuesto:

```
@@unique([user_id, self_user_id])  // una Person por par organizador-participante
```

### Pre-fill al unirse a nuevo organizador

Cuando un participante se une a un nuevo organizador, el formulario puede pre-rellenarse opcionalmente desde su Person más reciente (el participante decide). Pero la nueva Person es independiente — editar una no afecta a la otra.

---

## 2. Data Scoping — Dónde vive cada dato

| Dato | Alcance | Modelo | Razón |
|------|---------|--------|-------|
| Email, name, password | Global | User | Identidad pura |
| Gender, dietary, allergies, phone | Per-organizador | Person | Puede variar por contexto |
| Notas del organizador | Per-organizador | Person.notes | Privado del org |
| Nombre alternativo | Per-organizador | Person.name_display | El org puede conocerle por otro nombre |
| Visibilidad / descubrimiento | Per-organizador | Person.discoverable | Control por contexto |
| Rol en evento | Per-evento | EventPerson.role | Facilitador en uno, participante en otro |
| Pareja inseparable | Per-evento | EventPerson.inseparable_with_id | Distinta pareja por retiro |
| Peticiones | Per-evento | EventPerson.requests_text | "¿Puedo traer mi perro?" es del evento |
| Comidas | Per-evento | EventPerson | Distinto por agenda de cada retiro |

---

## 3. Multi-Rol: Rol jerárquico de plataforma

Se mantiene `User.role` como enum jerárquico (`admin > organizer > participant`). Los roles superiores pueden acceder a rutas de roles inferiores:

| Escenario | Cómo funciona |
|-----------|---------------|
| Admin + participante en evento | `role=admin`, tiene EventPerson. Accede a /admin Y /my-events |
| Organizador + participante en evento de otro | `role=organizer`, tiene EventPerson en evento ajeno. Accede a /dashboard Y /my-events |
| Participante + co-organizador | `role=participant`, tiene EventCollaborator. Accede a /events/[id] para ese evento |

### Middleware

- `/admin/*` → solo admin (sin cambios).
- `/dashboard`, `/events/*`, `/persons` → organizer + admin + usuarios con EventCollaborator.
- `/my-events/*`, `/my-profile` → TODOS los usuarios autenticados (quitar bloqueo a organizer/admin).
- Raíz `/` → admin→/admin, organizer→/dashboard, participant→comprobar collabs y luego /my-events.

### Navegación unificada

Links condicionales en el nav:
- "Admin" → si admin
- "Dashboard" → si organizer/admin/tiene collabs
- "Mis eventos" → si tiene algún EventPerson
- "Mi perfil" → siempre

---

## 4. Co-organizadores

### Schema

```prisma
model EventCollaborator {
  id       String @id @default(cuid())
  event_id String
  user_id  String
  event    Event  @relation(fields: [event_id], references: [id], onDelete: Cascade)
  user     User   @relation(fields: [user_id], references: [id], onDelete: Cascade)
  @@unique([event_id, user_id])
}
```

Campo adicional en Event:
```
collab_invite_code String? @unique
```

### Flujo

1. El dueño del evento genera un enlace de invitación → `/join-collab/{code}`.
2. El destinatario abre el enlace, se loguea si es necesario.
3. Ve info del evento + botón "Unirte como co-organizador".
4. Acepta → se crea `EventCollaborator` → redirige a `/events/{id}/board`.

### Permisos del co-organizador

- Acceso completo a board, participantes, agenda del evento.
- NO puede eliminar el evento (solo el dueño).
- NO puede invitar a más co-organizadores (solo el dueño).

### Cambios en queries de evento

```
getEventsByUser: OR: [{ user_id }, { collaborators: { some: { user_id } } }]
```

Helpers nuevos en `auth-context.ts`:
- `canAccessEvent(ctx, eventId)` → true si admin, dueño, o EventCollaborator.
- `isOwner(ctx, eventId)` → solo dueño (para eliminar evento).

---

## 5. Invitación de administradores

### Schema

```prisma
model AdminInviteToken {
  id         String   @id @default(cuid())
  token      String   @unique
  created_by String
  expires_at DateTime
  created_at DateTime @default(now())
}
```

### Flujo

1. Admin genera token desde `/admin/users` → botón "Invitar admin".
2. Enlace: `/join-admin/{token}`.
3. Destinatario se registra/loguea → confirma → `User.role` cambia a admin → token consumido.

---

## 6. Filtro de organizador en admin

En `/admin/events`:
- Dropdown para seleccionar organizador (fetch de todos los organizadores).
- Al seleccionar, se filtran eventos por `user_id` del organizador seleccionado.
- Permite gestionar contenido del organizador seleccionado.

---

## 7. Entornos privados vs abiertos

### Concepto

Campo `environment` en User (solo para organizer/admin):

```prisma
enum OrganizerEnvironment {
  open     // Comunidades, retiros públicos — default
  private  // Empresas, entornos premium
}
```

### Comportamiento

- **Aislamiento por diseño**: los registros Person están scoped al organizador vía `person.user_id`. Los datos de un org privado son invisibles por diseño, no por filtro de query.
- **`environment` controla descubrimiento**: los eventos de orgs privados nunca aparecen en un futuro marketplace.
- **Cambiar open→private**: oculta del marketplace. Datos sin cambios.
- **Cambiar private→open**: expone al marketplace. Sin migración.

### Pricing

Entornos privados serán premium en la política de precios (sobre-coste por privacidad garantizada y funcionalidades corporativas).

---

## 8. Relaciones entre participantes (invitar pareja/amigos)

### Schema

```prisma
model RelationshipInvite {
  id                String           @id @default(cuid())
  event_id          String
  sender_user_id    String
  recipient_email   String
  recipient_user_id String?
  relationship_type RelationshipType // inseparable | flexible
  token             String           @unique
  status            InviteStatus     // pending | accepted | declined | expired
  expires_at        DateTime
  created_at        DateTime         @default(now())
  resolved_at       DateTime?
}
```

### Flujo

1. Participante en su vista del evento → botón "Invitar compañero".
2. Introduce email y tipo de relación (inseparable / flexible).
3. Sistema genera enlace `/rel/{token}` → se envía al destinatario.
4. Destinatario abre enlace → ve info del evento + nombre del remitente + tipo de relación.
5. Tres sub-flujos:
   - **No registrado** → se registra + se une al evento + se establece relación.
   - **Registrado, no en el evento** → se une al evento + se establece relación.
   - **Registrado, ya en el evento** → acepta/rechaza relación.

### Restricciones

- Máximo 1 invitación inseparable por evento por persona.
- Expira al inicio del evento.
- Hereda contexto organizador/evento (privacidad, creación de Person).

### Conflicto inseparable

Si B ya tiene pareja inseparable C, B debe romper con C antes de aceptar la invitación de A (el sistema avisa).

---

## 9. Descubrimiento de participantes

Campo en Event:
```
participant_discovery Boolean @default(false)
```

### Triple puerta de seguridad

Para que un participante sea visible a otro:
1. El evento tiene `participant_discovery = true` (configurado por organizador).
2. La Person del participante tiene `discoverable = true`.
3. No existe un bloqueo entre los usuarios (tabla `UserBlock`, fase futura).

### Datos expuestos

Mínimo: nombre visible + avatar (si existe). Sin email ni datos personales.

---

## 10. Schema adicional (Fase futura)

### UserBlock — Bloqueo/Reporte

```prisma
model UserBlock {
  blocker_id String
  blocked_id String
  @@unique([blocker_id, blocked_id])
}
```

### Infraestructura de mensajería

Pendiente de diseño. Depende de descubrimiento de participantes.

---

## 11. Edge cases considerados

| Caso | Solución |
|------|----------|
| Organizador cambia open→private | Eventos se ocultan del marketplace. Datos sin cambios |
| Detección de Person duplicada | Al unirse a nuevo org, comprobar Person existente por contact_email antes de crear |
| Eventos recurrentes | Person persiste, EventPerson fresco por evento, relaciones frescas |
| GDPR derecho al olvido | Eliminar User → `Person.self_user_id` pasa a null (onDelete: SetNull). Person queda como entrada anónima de directorio |
| Participante deja un organizador | `Person.self_user_id = null`. EventPerson queda (histórico) |
| Conflicto inseparable | Si B ya tiene pareja C, debe romper con C antes de aceptar A (sistema avisa) |

---

## 12. Extensibilidad futura: hacia una red social

El modelo actual (User = login, Person = per-organizador) es extensible sin migración destructiva:

**Hoy (MVP 1.2)**: User = login puro. Person = datos per-organizador. Todo aislado.

**Futuro (red social)**: Se añaden campos de perfil global al User (gender, dietary, bio, avatar, phone...). Para organizaciones **open**, esos campos actúan como **defaults** — se copian a la Person cuando te unes, pero puedes sobreescribirlos. Para organizaciones **private**, se ignoran completamente — siempre rellenan desde cero.

```
Al unirse a organización OPEN:
  → Person se crea pre-rellenada desde User.profile (global)
  → Participante puede editar su Person (override local)
  → Si actualiza su perfil global, NO se propaga a Person existentes
    (evita sorpresas: "cambié mi teléfono y ahora el yoga tiene mi nuevo número")

Al unirse a organización PRIVATE:
  → Person se crea vacía, rellenar manualmente
  → Perfil global nunca se lee ni se aplica
```

Esto encaja porque:
1. No hay migración destructiva — añadir campos al User es aditivo.
2. Person sigue siendo la fuente de verdad para cada organización.
3. El flag `open/private` determina si el perfil global se usa como template o se ignora.
4. Marketplace futuro: los eventos de orgs `open` se listan públicamente, el perfil global del User se usa como "tarjeta de presentación" en la red.
