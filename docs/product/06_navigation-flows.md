# Flujos de Navegación y Vistas

Este documento describe las pantallas y flujos fuera del Board principal.

---

## 1. Autenticación (MVP)

### 1.1 Login
- Email + contraseña
- Tras login → Dashboard

### 1.2 Registro
- Nombre, email, contraseña
- Tras registro → Dashboard
- Se crean los Amenities por defecto para el nuevo usuario

---

## 2. Dashboard (MVP)

Vista principal tras autenticarse. Versión simplificada.

### 2.1 Layout
```
┌──────────────────────────────────────────────┐
│ Header: Logo | Nombre usuario | Avatar        │
├──────────────────────────────────────────────┤
│                                              │
│  Mis Eventos (cards)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ Evento1 │ │ Evento2 │ │ + Nuevo │        │
│  │ fecha   │ │ fecha   │ │ Evento  │        │
│  │ 42/50   │ │ 18/30   │ │         │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│                                              │
└──────────────────────────────────────────────┘
```

### 2.2 Sección: Mis Eventos
- Cards de eventos del usuario (todos los status visibles)
- Cada card muestra: nombre, fechas, KPI resumen (asignados/total)
- Click en card → entra al Board del evento
- Card "+ Nuevo Evento" → abre formulario de creación

---

## 3. Crear Evento (MVP)

Formulario simple de un solo paso (no wizard):

- Nombre del evento (obligatorio)
- Fecha inicio y fecha fin (obligatorios)
- Número estimado de participantes (obligatorio)
- Botón "Crear Evento"

Al crear:
- Se generan habitaciones por defecto según el número de participantes (plantilla "mostly doubles")
- Se redirige directamente al Board
- Las habitaciones se pueden editar desde el Board (añadir, quitar, renombrar, cambiar capacidad)

---

## 4. Mapa de navegación (MVP)

```
Login/Registro
    │
    ▼
Dashboard
    ├── Mis Eventos → click → Board (05_ui-interactions.md)
    └── + Nuevo Evento → formulario → crear → Board
```

---

## FUTURE (post-MVP)

### Venues (Localizaciones reutilizables)
- Entidad Venue con VenueRooms como plantilla
- Crear venue manualmente o importar desde evento
- Detalle/edición de venue: nombre, dirección, amenities, lista de habitaciones
- Selección de venue al crear evento (wizard paso 2)
- Guardar configuración de evento como venue / actualizar venue existente

### Wizard de creación de evento (4 pasos)
- Paso 1: Datos básicos (actual formulario MVP)
- Paso 2: Selección de localización (requiere Venues)
- Paso 3: Edición de habitaciones pre-creación
- Paso 4: Confirmación con resumen

### Dashboard extendido
- Sección "Mis Localizaciones" con cards de venues
- Sección "Mis Personas" con acceso al directorio
- Historial de eventos archivados (solo lectura, opción reactivar)
- Icono engranaje para configuración

### Directorio de personas
- Vista completa con búsqueda, filtros, edición masiva
- Gestión de contactos independiente de eventos

### Autenticación extendida
- Recuperar contraseña
- Verificación de email
- Login social (Google, etc.)

### Roles de usuario
- **superadmin**: panel de administración con todos los usuarios y eventos
