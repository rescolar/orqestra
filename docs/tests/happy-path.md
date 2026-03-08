# Happy Path — Test Manual

Recorrido completo de Orqestra en orden lógico.
Se necesitan **2 navegadores** (o uno normal + uno incógnito) para simular roles distintos.

- **Navegador A** = Organizador (y luego Admin)
- **Navegador B** = Participante (y luego Co-organizador / Centro)

---

## 1. Registro e inicio de sesion (Nav A)

1. Ir a `/register`
2. Crear cuenta de organizador (nombre, email, password)
3. Verificar redirect a `/dashboard`
4. Cerrar sesion
5. Ir a `/login`, entrar con las credenciales
6. Verificar que se ve el dashboard vacio

---

## 2. Crear evento (Nav A)

1. Click "Nuevo Evento"
2. Rellenar nombre, fecha inicio, fecha fin, participantes estimados → Siguiente
3. **Room setup** (`/events/[id]/setup`): crear habitaciones por tipo (ej: 3 dobles con baño, 2 triples sin baño) → Siguiente
4. **Detalle** (`/events/[id]/detail`): añadir descripcion, ubicacion larga (80+ chars), imagen opcional
5. Verificar que en el dashboard la tarjeta muestra:
   - Nombre, fechas, ubicacion truncada con "..."
   - Barra de capacidad proporcional con "0/N"
   - Badge "Al dia"

---

## 3. Tablero: habitaciones (Nav A)

1. Entrar al tablero (`/events/[id]/board`)
2. Verificar layout 3 columnas: sidebar izq, grid centro, panel der vacio
3. Crear una habitacion nueva desde el boton "+"
4. Click en una habitacion → se abre **panel de habitacion** a la derecha
   - Editar nombre inline
   - Cambiar capacidad
   - Activar baño privado
   - Cambiar restriccion de genero (ej: "Mujeres")
   - Activar candado (room bloqueada)
   - Verificar que los iconos del card se actualizan en tiempo real
5. Cerrar panel

---

## 4. Tablero: participantes y asignacion (Nav A)

1. Click "Seed" en la sidebar → se crean ~15 participantes de prueba
2. Verificar que aparecen en la sidebar izquierda, separados por rol
3. Probar tabs: Todos / Participantes / Facilitadores
4. Probar busqueda por nombre
5. **Drag & drop sidebar → habitacion**: arrastrar un participante a una habitacion
   - Verificar que aparece en el card de la habitacion
   - Verificar que desaparece de la sidebar
6. **Drag & drop habitacion → habitacion**: mover persona entre habitaciones
7. **Unassign**: click "x" en el chip de la persona → vuelve a sidebar
8. **Validaciones**:
   - Arrastrar hombre a habitacion "Solo mujeres" → debe rechazar (hard block)
   - Arrastrar persona a habitacion bloqueada → debe rechazar
   - Arrastrar persona cuando capacidad esta llena → debe permitir (crea conflicto)

---

## 5. Panel de persona (Nav A)

1. Click en un participante (sidebar o card) → se abre **panel de persona**
2. Cambiar rol: participante ↔ facilitador → verificar que cambia en sidebar y card
3. Cambiar status a "tentativo"
4. Cambiar genero
5. Abrir seccion contacto → editar email, telefono
6. Marcar requisitos dieteticos (checkboxes)
7. Escribir en campo de alergias (fondo rojo)
8. Escribir en preferencias + marcar "Gestionado"
9. Escribir en solicitudes
10. Verificar auto-save (sin boton guardar)

---

## 6. Relaciones (Nav A)

1. Click en persona A para abrir su panel
2. Arrastrar persona B desde la sidebar al area "Relaciones" del panel
3. Verificar que aparece chip de B en relaciones de A
4. Click en el chip de B → activar "inseparable" (icono de link)
   - Verificar que B se mueve automaticamente a la misma habitacion que A
5. Arrastrar A a otra habitacion → verificar que B tambien se mueve
6. Click "x" en el chip → eliminar relacion

---

## 7. Pendientes (Nav A)

1. Click en "Pendientes: N" en el header
2. Verificar las 4 secciones:
   - **Dieteticos/Alergias**: personas con dieta sin notificar → toggle "Gestionado"
   - **Conflictos de habitacion**: capacidad excedida o genero incorrecto → toggle "Reconocido"
   - **Participantes tentativos**: boton "Confirmar" cambia status
   - **Solicitudes**: texto de request → toggle "Gestionado"
3. Resolver todos los pendientes → header cambia a verde "Pendientes: 0"

---

## 8. Pre-asignacion automatica (Nav A)

1. Desasignar todos los participantes (o crear evento nuevo con seed)
2. Click "Pre-asignar"
3. Verificar que el algoritmo respeta:
   - Restricciones de genero
   - Habitaciones bloqueadas (no asigna)
   - Inseparables juntos
4. Verificar distribucion visual en el grid

---

## 9. Programa / Agenda (Nav A)

1. Ir a `/events/[id]/schedule` (link "Programa" en header del board)
2. Verificar tabs de dias (uno por cada dia del evento)
3. **Crear bloque comun**: titulo, hora → aparece en la columna del dia
4. Click en actividad del bloque → panel derecho con titulo/descripcion editables
5. **Crear bloque paralelo**: titulo, hora
6. Añadir 2-3 actividades al bloque paralelo
7. Click en actividad paralela → aparece sidebar izq con no asignados
8. Arrastrar participante al panel de actividad → queda asignado
9. Editar max_participants en una actividad → verificar indicador de capacidad
10. Toggle "Cerrada" en una actividad
11. Verificar KPIs en header: "sin asignar", "exceso aforo"
12. Click "Incidencias" → panel con detalles
13. Click "Confirmar agenda" → verificar badge "Confirmada" y header verde

---

## 10. Reporte de cocina (Nav A)

1. Ir a `/events/[id]/kitchen`
2. Verificar tabla: nombre, habitacion, dieta, alergias, comidas
3. Toggle "Gestionado" en algun participante
4. Click "Marcar todos notificados"
5. Probar exportar CSV
6. Probar vista de impresion

---

## 11. Recepcion (Nav A)

1. Ir a `/events/[id]/reception`
2. Verificar lista de participantes confirmados
3. Buscar un participante por nombre
4. Click para hacer check-in → aparece timestamp
5. Verificar contador de checked-in vs total
6. Deshacer check-in

---

## 12. Invitar participante (Nav A → Nav B)

1. En Nav A: hover sobre la tarjeta del evento en dashboard → click icono de invitacion
2. Copiar el link de invitacion
3. En **Nav B**: pegar el link → `/join/[code]`
4. Ver info del evento y nombre del organizador
5. Click "Registrarme" → formulario de registro (nombre, email, password)
6. Verificar redirect a `/my-events`

---

## 13. Portal del participante (Nav B)

1. Ver lista de eventos en `/my-events`
2. Click en el evento → `/my-events/[id]`
3. Cambiar status (confirmado/tentativo)
4. Marcar preferencias de comida (primera cena, ultimo almuerzo)
5. Escribir solicitudes en texto libre
6. **Pestaña Programa**: ver agenda
   - Click "Apuntarme" en una actividad paralela → "En lista de espera" (amber)
   - Si la agenda esta confirmada → "Confirmado" (verde)
   - Verificar actividad cerrada: boton deshabilitado + badge "Cerrada"
7. Ir a `/my-profile` → editar nombre, genero, dieta, alergias
8. Toggle "Descubrible" (si el organizador lo habilito)

---

## 14. Co-organizador (Nav A → Nav B)

1. En Nav A: ir a `/events/[id]/detail` → seccion Colaboradores
2. Generar link de co-organizador → copiar
3. En Nav B: cerrar sesion del participante
4. Registrar nueva cuenta de organizador (o usar otra existente)
5. Pegar link `/join-collab/[code]` → aceptar
6. Verificar que el evento aparece en el dashboard de Nav B con badge "Co-org"
7. Entrar al tablero → verificar acceso completo (arrastrar, editar habitaciones, etc.)
8. En Nav A: verificar que el colaborador aparece en la lista y se puede eliminar

---

## 15. Portal del centro (Nav A → Nav B)

1. En Nav A: ir a `/events/[id]/kitchen`
2. Click boton de compartir con centro → generar link
3. Copiar link
4. En **Nav B** (sin login, ventana incognito): pegar link → `/centro/[token]`
5. Ver landing: nombre evento, organizador, fechas, ubicacion, nro confirmados
6. Click "Ir a cocina" → `/centro/[token]/cocina`
7. Verificar reporte de cocina con datos minimizados (sin contacto personal)

---

## 16. Directorio de personas (Nav A)

1. Ir a `/persons`
2. Crear persona nueva: nombre, genero, rol, email, dieta, alergias
3. Editar una persona existente → verificar que los cambios se reflejan
4. Verificar que al añadir esa persona a un evento, hereda sus datos

---

## 17. Ajustes del organizador (Nav A)

1. Ir a `/settings`
2. Editar nombre de marca, mensaje de bienvenida
3. Cambiar colores de branding
4. Cambiar slug personalizado
5. Toggle entorno: abierto (descubrible) / privado

---

## 18. Panel de admin (Nav A)

1. Promover el usuario a admin (via DB o seed)
2. Ir a `/admin`
3. Verificar stats: organizadores, eventos, personas
4. `/admin/users`: ver lista, cambiar rol de un usuario
5. `/admin/events`: ver todos los eventos de todos los organizadores
6. Generar token de invitacion admin → copiar
7. En Nav B: usar `/join-admin/[token]` → verificar que el usuario se convierte en admin

---

## Checklist rapido

| # | Flujo | Status |
|---|-------|--------|
| 1 | Registro + login | |
| 2 | Crear evento (wizard 3 pasos) | |
| 3 | Habitaciones (CRUD + panel) | |
| 4 | Participantes + drag & drop | |
| 5 | Panel de persona (auto-save) | |
| 6 | Relaciones + inseparable | |
| 7 | Pendientes (4 tipos) | |
| 8 | Pre-asignacion automatica | |
| 9 | Programa / Agenda | |
| 10 | Reporte de cocina | |
| 11 | Recepcion / Check-in | |
| 12 | Invitar participante | |
| 13 | Portal del participante | |
| 14 | Co-organizador | |
| 15 | Portal del centro | |
| 16 | Directorio de personas | |
| 17 | Ajustes del organizador | |
| 18 | Panel de admin | |
