# Interactions (MVP)

## Drag & Drop

- Arrastrar participante desde:
  - No asignados
  - Buscador
  - Otra habitación
- Permitir exceder capacidad (marca conflicto)
- Restricciones duras bloquean movimiento
- Si pertenece a grupo fuerte:
  - Popup: mover solo / mover grupo completo
- Undo revierte movimiento

## Estados Participante

status:
- confirmed
- tentative
- cancelled

tentative:
- Cuenta en ocupación
- Badge visible
- Entra en Pendientes

cancelled:
- Se elimina de habitación
- No se borra del sistema
- Puede restaurarse

## Grupos

Tipo:
- strong (parejas, grupo fuerte)
- flexible

Reglas:
- strong → confirmación al dividir
- flexible → se puede romper sin confirmación fuerte
- Se puede congelar grupo
- Dividir grupo manualmente

## Pendientes (contador único)

Incluye:

- Conflictos
- Preferencias no resueltas
- Alergias no gestionadas
- Participantes dudosos

Panel Pendientes muestra:
- Secciones separadas por tipo
- Cada elemento clicable

## Alergias

- Texto libre
- Checkbox “Alergias gestionadas”
- Si texto existe y no gestionado → entra en Pendientes
- Export específico de alergias

## Pre-asignar

- Solo no asignados
- No modifica asignaciones existentes
- Respeta habitaciones cerradas
- Respeta grupos congelados
- Prioridad:
  1. Grupos fuertes
  2. Grupos flexibles
  3. Mujeres sueltas
  4. Hombres sueltos
  5. Dudosos

Registra una única acción para Undo

## Undo

- Visible en header
- Revierte última acción
- Acciones registradas:
  - move_participant
  - move_group
  - split_group
  - change_status
  - preassign
  - discard
- Solo dentro de sesión