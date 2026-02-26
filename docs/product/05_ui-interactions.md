# UI/UX — Interacciones y Paneles (MVP)

Este documento detalla el comportamiento de cada zona de la interfaz, cómo se navega entre paneles, y las reglas de propagación de estado.

---

## 1. Layout general

```
┌──────────────────────────────────────────────────────────┐
│ Header (sticky): Logo + Evento + Fechas | KPIs | Undo    │
├───────────┬────────────────────────┬─────────────────────┤
│ Izquierda │ Centro (flex)          │ Panel Derecho 384px │
│ 264px     │                        │ (contextual)        │
└───────────┴────────────────────────┴─────────────────────┘
```

Vista única: Board de Habitaciones. El panel derecho cambia según el contexto (ver sección 5).

---

## 2. Header (sticky)

- Logo + nombre del evento + fechas (date_start – date_end)
- KPIs: Asignados X/Y, Rooms N, No Asignados M, **Pendientes P**
  - "No Asignados" es clicable → enfoca la sección en columna izquierda
  - **"Pendientes: N" es clicable → abre el panel de Tareas Pendientes en la columna derecha**
- Botón Undo (+ Ctrl/Cmd+Z)
- Avatar del usuario
- El header cambia a fondo verde cuando Pendientes == 0

---

## 3. Columna izquierda (Personas)

### 3.1 Buscador
- Placeholder: "Buscar personas..." (cubre participantes y facilitadores)
- Filtra por nombre, muestra resultados con relaciones de grupo indentadas (↳)
- Resultados clickables (abren panel derecho) y arrastrables (para asignar)

### 3.2 Tabs de filtro por rol
- Todos | Participantes | Facilitadores
- Barra de tabs debajo del buscador

### 3.3 Pool de no asignados
Separado en dos secciones:
- **"No asignados (Participantes)"** con contador
- **"No asignados (Facilitadores)"** con contador

### 3.4 Elementos de la lista
- Avatar (imagen o iniciales)
- name_display (nombre compacto)
- Texto de estado (En Espera, Seleccionado, etc.)
- Pill de rol: "PARTICIPANTE" o "FACILITADOR"
- Menú 3 puntos

### 3.5 Acciones
- **"+ Persona"** → abre formulario/dialog para crear una nueva persona individual (nombre, rol, género mínimo). Se crea Person en directorio + EventPerson en el evento. Diferente de "Añadir lista" que es para pegar múltiples nombres
- "Añadir lista" → abre modal de pegar nombres
- **"Pre-asignar"** → ejecuta la asignación automática inteligente. Solo visible si hay participantes no asignados. Respeta grupos, restricciones de género, capacidad. Nunca coloca facilitadores. Ver reglas en `03_domain-model.md` § Pre-assignment Rules
- "+ Grupo" → crea nuevo grupo

---

## 4. Grid central (Habitaciones)

### 4.1 Secciones del grid
Dos secciones visualmente separadas:
- **"Habitaciones Participantes"** — rooms con room_type == general
- **"Habitaciones Facilitadores"** — rooms con room_type == facilitator (borde primary, badge "Facilitador")

### 4.2 Card de habitación
- Barra de color superior (6px): verde (ok), amarillo (warn), rojo (danger), gris (closed), **primary (facilitador)**
- Header: display_name + internal_number
- Badge de capacidad: "X/Y" con color contextual
- Personas asignadas como filas con drag handle
- Badge "1 dudoso" si hay tentatives
- Texto de conflicto inline (ej. "Restricción women incumplida")
- Placeholder dashed para slots vacíos
- Footer: "Cerrada", "Disponible", "Acción Requerida"
- **Click en la card → abre panel derecho "Detalles de la Habitación"**

### 4.3 Card "+ Nueva Habitación"
- Borde dashed, click para crear nueva habitación
- Abre dialog/inline form: nombre (opcional), código (auto-generado), capacidad, tipo (general/facilitador), restricción de género (mixta por defecto)
- La nueva habitación aparece inmediatamente en la sección correspondiente del grid

### 4.4 Controles del grid
- Toggle vista: grid / lista (iconos arriba a la derecha)
- Toolbar: ocultar completadas, mostrar cerradas, exportar alergias

---

## 5. Panel derecho (contextual)

El panel derecho muestra **una de tres vistas** según la interacción del usuario:

### 5.1 "Detalles de la Persona"
**Se abre al:** hacer click en una persona (desde lista izquierda, desde chip en habitación, o desde ítem de pendientes).

Contenido:
- Avatar (imagen o iniciales) con dot de estado
- Nombre + subtítulo (ej. "Participante Individual")
- **Toggle de rol** (prominente): Participante / Facilitador (segmented control)
- **Banner informativo** (si facilitador): "En fase 1, la pre-asignación automática no coloca facilitadores."
- **Estado**: Dudoso / Confirmado / Cancelado (dropdown)
- **Género**: H / M / O / ND (segmented buttons)
- **Fechas del evento**: llegada + salida (readonly, del evento)
- **Contacto** (accordion colapsable): email, teléfono, dirección
- **Afiliación de grupo**: chips de pareja/amigos (removibles ×), botón añadir (+)
  - Checkbox "Si muevo a este facilitador, sugerir mover también a su pareja"
- **Requerimientos dietéticos**: botones toggle V (vegetariano) / SG (sin gluten) / SL (sin lactosa) + toggle "Gestionado"
- **Preferencias**: textarea libre + toggle "Gestionado"
- **Alergias**: textarea libre (fondo rojo suave) + toggle "Gestionado"
- **Botón "Descartar Participante"** (rojo, al final)
- Autosave: todos los cambios se persisten inmediatamente

### 5.2 "Detalles de la Habitación"
**Se abre al:** hacer click en una card de habitación en el grid.

Contenido:
- Icono (Material Symbol en círculo coloreado) con dot de estado
- **Nombre editable** (display_name, inline)
- **Código editable** (internal_number, inline)
- Badge de estado: "Disponible" / "Completa" / "Acción Requerida" / "Cerrada"
- **Capacidad**: input numérico + texto "X / Y Ocupado"
- **Lista de personas asignadas**: avatar + nombre, hover muestra drag handle + botón desasignar (remove_circle). Placeholder "Espacio disponible" para slots vacíos. Botón "Añadir" para asignar persona
- **Descripción**: textarea libre (ubicación, tipo de cama, etc.)
- **Etiquetas y Equipamiento**:
  - Tags: pills removibles (ej. "Planta Baja", "Litera disponible") + botón "Etiqueta" para añadir
  - Amenities: lista de checkboxes del catálogo (Wi-Fi, Calefacción, Aire Acondicionado, etc.)
- **Botones footer**: "Descartar" (secundario) + "Guardar Cambios" (primario)

### 5.3 "Tareas Pendientes"
**Se abre al:** hacer click en el badge "Pendientes: N" del header.

Contenido:
- **Tarjeta resumen** (fondo primary, texto blanco): "TOTAL PENDIENTES: N"
- **Secciones por prioridad** (cada una con header de sección):

  1. **"Alergias y Dietas (Prioridad Alta)"** — header rojo. Cada ítem: nombre de persona, descripción de alergia/dieta, toggle "Gestionado"
  2. **"Conflictos de Habitación"** — nombre de habitación, descripción del conflicto (ej. "Capacidad excedida 3/2"), toggle "Gestionado". Borde rojo en la card
  3. **"Participantes Dudosos"** — nombre de persona, toggle "Confirmado" (al activar cambia status a confirmed)
  4. **"Preferencias no Resueltas"** — nombre de persona, texto de preferencia, toggle "Gestionado"

- **Cada ítem tiene un toggle inline** para resolverlo directamente sin navegar al detalle de persona/habitación
- **Cada ítem también es clicable** → navega al panel de detalle de persona o habitación correspondiente
- El panel **permanece abierto** tras resolver ítems — el usuario lo cierra manualmente con la ×

---

## 6. Modal "Añadir Participantes"

- Textarea para pegar lista de nombres (uno por línea)
- Previsualización de chips compactos antes de confirmar
- Detección automática de cantidad
- Opción de marcar como dudoso (tentative) con badge
- Aditivo: nunca elimina participantes existentes
- Botones: "Cancelar" / "Agregar participantes"

---

## 7. Interacciones de arrastrar y soltar (Drag & Drop)

### 7.1 Orígenes de arrastre
- Pool de no asignados (columna izquierda)
- Resultados de búsqueda
- Chips/filas de personas en una habitación (mover entre habitaciones)

### 7.2 Reglas de drop
- Exceder capacidad: permitido (genera conflicto visible)
- Restricción de género: **hard constraint** (bloquea el drop)
- Rol ↔ tipo de habitación: **hard constraint** (participante → hab facilitador: bloqueado, y viceversa)

### 7.3 Arrastre de grupo fuerte
- Popup: "Mover solo" / "Mover grupo completo"
- Separar grupo fuerte requiere confirmación explícita

### 7.4 Arrastre de facilitador con pareja
- Si move_with_partner está activado: sugerir mover también a su pareja

---

## 8. Propagación reactiva de estado

Cuando se resuelve un pendiente (desde el panel de Tareas Pendientes O desde el panel de detalle de persona/habitación), **TODAS las vistas afectadas deben actualizarse inmediatamente**:

| Acción | Vistas que se actualizan |
|---|---|
| Toggle "Gestionado" en alergia/dieta | Header pending_count, panel pendientes (ítem desaparece), persona: badge/estado |
| Toggle "Gestionado" en conflicto de habitación | Header pending_count, panel pendientes, room card (barra de color, icono conflicto, texto) |
| Toggle "Confirmado" en dudoso | Header pending_count, panel pendientes, persona chip (badge "dudoso" desaparece), room card (badge "1 dudoso" se actualiza), lista izquierda |
| Toggle "Gestionado" en preferencia | Header pending_count, panel pendientes, persona: estado pendiente |
| Mover persona (drag & drop) | Header asignados/no asignados, room cards origen y destino (capacidad, barra color, conflictos), lista no asignados, panel pendientes si se resuelve/crea conflicto |
| Pre-asignar | Header asignados/no asignados/pendientes, todas las room cards afectadas, lista no asignados (se vacía) |

**El header cambia a fondo verde cuando pending_count llega a 0.**

---

## 9. Undo

- Botón visible en el header + Ctrl/Cmd+Z
- Solo dos tipos de acción son deshacibles:
  - **assign_person**: asignar/mover/desasignar persona de habitación
  - **link_persons**: crear/modificar/romper relaciones de grupo
- Pre-asignar se registra como batch (un solo Undo revierte todas las asignaciones)
- Stack de undo es de sesión (no se persiste entre sesiones)
- Cambios de estado, rol, ediciones de habitación NO se deshacen (son toggles triviales)

---

## 10. Autosave

- Todos los cambios se persisten automáticamente
- No existe botón "Guardar" en el panel de persona
- El panel de habitación tiene botones "Guardar Cambios" / "Descartar" (excepción: edición de formulario complejo)
