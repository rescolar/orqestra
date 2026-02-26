# Requirements Master (MVP + Future Hooks)

Este documento consolida TODOS los requisitos acordados hasta ahora.
Formato:
- [MVP] Requisito necesario para la primera versión usable.
- [FUTURE] Requisito explícitamente pospuesto, pero diseñado para no bloquearlo.

---

## 0. Principios de producto

- [MVP] La emoción dominante del producto debe ser **Control y Claridad**.
- [MVP] El producto es **desktop-first** (uso principal en portátil) porque hoy se usa Excel en portátil.
- [MVP] El móvil/tablet no es foco del MVP; se contempla como soporte operativo futuro sin forzar drag&drop táctil. [FUTURE]
- [MVP] El layout debe ser **estable**, sin desplazar el board horizontalmente al abrir paneles.

---

## 1. Navegación y estructura general

- [MVP] El MVP tiene **una sola vista principal**: Board de Habitaciones.
- [MVP] No hay “barra lateral de secciones” ni multi-vistas en MVP (participantes, log, etc.). [FUTURE]
- [MVP] Todo el detalle se gestiona con:
  - Columna izquierda fija (buscador + listas)
  - Grid central (habitaciones)
  - Panel derecho contextual (participante / grupo / pendientes)
  - Modales puntuales (añadir participantes, export)

---

## 2. Header fijo (Centro de Control)

- [MVP] El header debe ser **fijo** (sticky) y siempre visible.
- [MVP] El header muestra claramente:
  - Asignados: X / Total
  - Habitaciones: N
  - No asignados: M
  - Pendientes: P
- [MVP] El header cambia a un **verde suave** cuando Pendientes = 0.
- [MVP] “No asignados” es **clicable**: enfoca/abre la sección No asignados en la columna izquierda.
- [MVP] “Pendientes” es **clicable**: abre panel derecho con listado detallado de pendientes.
- [MVP] Botón **Undo** visible en header:
  - Activo solo cuando hay acciones deshacibles.
  - Soporta Ctrl/Cmd+Z (opcional pero recomendado).
- [MVP] El panel de pendientes se queda abierto tras resolver un pendiente; solo se vuelve al board al cerrarlo manualmente.

---

## 3. Creación de evento y habitaciones iniciales

- [MVP] Crear evento requiere mínimo:
  - Nombre del evento
  - Número estimado de participantes
- [MVP] Tras crear el evento, el sistema genera **habitaciones por defecto** automáticamente según una plantilla simple (p.ej. “mostly doubles” o tamaño medio). No requiere que el usuario defina todo manualmente antes de ver el board.
- [MVP] Las habitaciones deben tener:
  - Numeración interna (Hab 01, Hab 02…)
  - Nombre visible opcional “emocional” (Sol, Luna, Estrellas, Júpiter…)
- [MVP] En la tarjeta de habitación se muestra:
  - Nombre visible (emocional si existe)
  - Subtítulo con numeración interna (si existe nombre emocional)
- [MVP] Orden del grid:
  - Si hay nombres personalizados: orden alfabético por nombre visible
  - Si no: orden por numeración interna

---

## 4. Board de habitaciones (Grid)

- [MVP] Layout del board: **tarjetas en grid** (tipo Notion/Trello), escalable a 30–50+ habitaciones.
- [MVP] Cada habitación muestra participantes como **etiquetas compactas** (chips), arrastrables.
- [MVP] En cada habitación el contador “ocupación” es visible: `ocupadas / capacidad` (ej. 2/3).
- [MVP] La capacidad puede **excederse temporalmente** mientras se organiza:
  - Se permite llegar a 4/3, 3/2, etc.
  - Esto se marca como conflicto “Capacidad excedida”.
  - Esto evita necesidad estricta de bandeja “no asignados” para swaps (aunque la bandeja existe igualmente).
- [MVP] Estados de habitación deben ser detectables de forma rápida con señal “ligera, no agresiva”:
  - Barra superior fina (4–6px) por estado:
    - Verde: completa y válida
    - Amarillo: con disponibilidad
    - Rojo: conflicto
    - Gris: cerrada
  - Iconos discretos opcionales (⚠️ conflicto, 🔒 cerrada).
- [MVP] Debe existir filtro/visibilidad (al menos como control UI) para:
  - Mostrar/ocultar habitaciones cerradas y/o completadas (mínimo: ocultar completadas o cerradas).
  - (Vista 3 columnas “disponibilidad / problemas / completadas” es futura) [FUTURE]

---

## 5. Columna izquierda (Participantes)

### 5.1 Añadir participantes
- [MVP] Añadir participantes por **pegar lista de nombres** (un nombre por línea).
- [MVP] Importar Excel inteligente se pospone. [FUTURE]
- [MVP] El sistema guarda el nombre completo, pero el chip muestra por defecto: **Nombre + primer apellido**.
  - Ej: “José Luis Madrid Gómez” → chip “José Madrid”
  - Tooltip/hover puede mostrar nombre completo (recomendado).

### 5.2 Buscador
- [MVP] El buscador filtra por nombre y muestra coincidencias.
- [MVP] Al buscar, además de mostrar el match principal, debe mostrar **sus relaciones** debajo con sangrado.
- [MVP] Ejemplo requerido (comportamiento ilustrativo):
  - Buscar “Elena” muestra:
    - Elena Hernández 🔗
      ↳ Rafa Martín
      ↳ Fer López
    - Elena Pérez
      ↳ Marta Ruiz
- [MVP] Las relaciones indentadas deben ser:
  - Clickables para abrir su panel
  - Arrastrables para asignación
- [MVP] Si el participante pertenece a un grupo, el buscador lo refleja (icono 🔗 discreto, sin colorear fondo).

### 5.3 No asignados
- [MVP] Existe una sección “No asignados” visible en columna izquierda.
- [MVP] “No asignados” es el pool principal para asignación y se integra con el header clicable.

---

## 6. Panel derecho (Participante)

- [MVP] Al click en un participante, se abre panel derecho con su ficha.
- [MVP] El panel es **scroll independiente** del board y de la columna izquierda.
- [MVP] Seleccionar otro participante cambia el panel directamente (autosave), sin confirmaciones.

### 6.1 Autosave
- [MVP] Todos los cambios se guardan automáticamente (no hay botón “Guardar”).

### 6.2 Campos y acciones del participante
- [MVP] Campos editables:
  - Estado: Confirmado / Dudoso (tentative)
  - Género: no definido / mujer / hombre / otro (NO obligatorio)
  - Grupo (ver sección grupos)
  - Preferencias (texto libre) + flag “resuelto”
  - Alergias (texto libre) + flag “comunicado/gestionado”
- [MVP] Acción “Descartar participante”:
  - Cambia estado a “cancelled/descartado”
  - Lo **desasigna** de habitación si estaba asignado
  - Lo elimina de pendientes
  - No se borra del sistema
- [MVP] Acción “Restaurar participante” (si está descartado):
  - Vuelve como mínimo a “Dudoso” (tentative) por defecto

---

## 7. Estados del participante: Confirmado / Dudoso / Descartado

- [MVP] Un participante “Dudoso”:
  - Cuenta en ocupación
  - Tiene badge visual “Dudoso”
  - Entra en Pendientes
- [MVP] En la tarjeta de habitación:
  - El contador sigue siendo normal (2/2), pero muestra indicador adicional: “1 dudoso” (si aplica).
- [MVP] Cambiar Dudoso → Confirmado:
  - Lo saca de Pendientes
  - La habitación deja de mostrar “1 dudoso” automáticamente

---

## 8. Grupos (parejas/amistades)

### 8.1 Concepto
- [MVP] “Pareja” se implementa como **Grupo fuerte** de tamaño 2 (no entidad especial).
- [MVP] Tipos de grupo:
  - strong (fuerte)
  - flexible

### 8.2 Gestión de grupo
- [MVP] Se puede crear grupo desde la columna izquierda:
  - Definir nombre de grupo
  - Abrir tarjeta/panel de grupo
  - Arrastrar participantes al grupo
- [MVP] Se puede gestionar grupo desde panel de participante:
  - Crear/seleccionar grupo
  - Cambiar tipo strong/flexible
  - Congelar (locked)
- [MVP] Congelar grupo:
  - El motor de pre-asignación respeta grupos congelados

### 8.3 Movimiento de grupo
- [MVP] Al arrastrar participante que pertenece a grupo fuerte:
  - Popup: “Mover solo” / “Mover grupo completo”
- [MVP] Mover grupo fuerte completo puede requerir confirmación ligera contextual (no bloqueante).
- [MVP] Separar un grupo fuerte requiere confirmación explícita (acción intencional).

### 8.4 Dividir grupos grandes
- [MVP] Debe existir función para **dividir** grupos grandes en subgrupos para encajar en habitaciones.
- [MVP] El sistema NO divide automáticamente sin consentimiento:
  - Si un grupo no cabe, se ofrece “¿Dividir grupo?”
  - Propuesta mínima: 5 → (3 + 2) basada en capacidades disponibles
- [MVP] Los subgrupos deben mantener vínculo (rastreables como derivados del grupo original). (mínimo conceptual; implementación detallada puede ser fase 1.5 si se complica)

### 8.5 No transitividad automática
- [MVP] Las relaciones NO son transitivas automáticamente.
  - Ej: Elena pareja de Rafa, Rafa amigo de Fer, Fer amigo de Alfonso
  - NO se crea automáticamente un grupo de 4
  - Los grupos se crean explícitamente

---

## 9. Restricciones por género (habitaciones)

- [MVP] Habitaciones pueden tener restricción:
  - mixed / women / men
- [MVP] Género en participante no es obligatorio.
- [MVP] Si se viola restricción:
  - Se considera “restricción dura” (bloquea drop) o al menos genera conflicto visible (decisión pendiente de implementación).
  - Acordado: capacidad es flexible; género se considera más “hard” que capacidad.

---

## 10. Preferencias (texto libre) y resolución

- [MVP] Preferencias se capturan como texto libre por participante.
- [MVP] Preferencias tienen flag: “Resuelto”.
- [MVP] Si preferences_text existe y no está resuelto → entra en Pendientes.
- [MVP] No existe “Notas” separadas; solo Preferencias.

---

## 11. Alergias (crítico)

- [MVP] Alergias se capturan como texto libre separado de Preferencias.
- [MVP] Alergias tienen flag explícito de gestión (p.ej. “Comunicado a cocina / gestionado”).
- [MVP] Si allergies_text existe y no gestionado → entra en Pendientes.
- [MVP] Debe existir export específico para alergias (para enviar a cocina).

---

## 12. Pendientes (contador único + panel)

- [MVP] El header muestra un único contador “Pendientes”.
- [MVP] Pendientes agregan:
  - Conflictos (capacidad excedida, restricción violada, etc.)
  - Preferencias no resueltas
  - Alergias no gestionadas
  - Participantes dudosos
- [MVP] Al click, panel derecho muestra lista detallada, separada por secciones:
  - Alergias (prioridad alta)
  - Conflictos
  - Preferencias
  - Dudosos
- [MVP] Cada ítem es clicable y resalta/enfoca la habitación o participante relevante.
- [MVP] El panel se mantiene abierto al resolver items.

---

## 13. Pre-asignar (MVP)

- [MVP] Existe acción “Pre-asignar” que:
  - Solo coloca participantes en “No asignados”
  - NO reordena lo ya asignado
  - Respeta habitaciones cerradas
  - Respeta grupos congelados
- [MVP] Orden heurístico acordado (default):
  1) Grupos fuertes (parejas)
  2) Grupos flexibles
  3) Mujeres sueltas
  4) Hombres sueltos
  5) Dudosos al final
- [MVP] Pre-asignar se muestra como botón/acción solo si hay no asignados (para reducir ruido).
- [FUTURE] Pre-asignación avanzada con criterios, simulación, toggles (no aplicar género, ignorar amistades, etc.) tendrá su espacio en columna izquierda.

---

## 14. Undo (MVP UX)

- [MVP] Undo visible en el header.
- [MVP] Undo deshace la última acción relevante.
- [MVP] “Pre-asignar” se registra como una sola acción compuesta (un Undo revierte todo).
- [MVP] Log visible de actividad se pospone. [FUTURE]
- [FUTURE] El log de actividad puede incluir “reason codes” y servir para auditoría/analítica.

---

## 15. Export (Offline & Operativo)

- [MVP] Exportar plan offline (Excel/CSV y/o PDF).
- [MVP] El export debe permitir al organizador llevar un “plan offline” por si falla la app.
- [MVP] Export específico de alergias para cocina.
- [FUTURE] QR / check-in / app móvil lectora se contempla, no MVP.

---

## 16. Responsiveness (mínimo)

- [MVP] El layout debe degradar sin romperse en pantallas pequeñas, pero el uso principal es portátil.
- [FUTURE] Modo móvil con interacción “tap + mover” (sin drag&drop) para control en evento.

---

## 17. Out of Scope explícito (recordatorio)

- [MVP] No marketplace
- [MVP] No pagos avanzados
- [MVP] No roles/permisos
- [MVP] No import Excel inteligente
- [MVP] No simulación avanzada configurable
- [MVP] No multi-vistas (tabla participantes, vista log, etc.)