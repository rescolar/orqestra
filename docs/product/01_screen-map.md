# Screen Map (MVP)

## Vista principal: Board de Habitaciones

Layout estable:

-------------------------------------------------
| Header fijo                                   |
-------------------------------------------------
| Col Izq | Grid Habitaciones | Panel Derecho |
-------------------------------------------------

## Header fijo

Indicadores:

- Asignados: X / Y
- Habitaciones: N
- No asignados: M
- Pendientes: P

Si Pendientes = 0:
- Header cambia a verde suave.

Undo visible en header.

## Columna izquierda (fija)

- Buscador de participantes
- Lista “No asignados”
- Lista de participantes (filtrable)
- Crear grupo
- Añadir participantes (modal)
- Pre-asignar (solo si hay no asignados)

Buscador:
- Muestra match principal
- Debajo, indentadas, relaciones (grupo)

## Grid central

- Tarjetas en grid (4–6 columnas)
- Orden:
  - Alfabético si nombre personalizado
  - Numérico interno si no
- Scroll vertical

Cada tarjeta muestra:
- Barra superior de estado
- Nombre visible
- Capacidad (2 / 3)
- Indicador “1 dudoso” si aplica
- Icono conflicto si aplica
- Icono cerrado si aplica
- Chips compactos arrastrables

## Panel derecho contextual

Se abre al:
- Click participante
- Click grupo
- Click pendiente

Scroll independiente.

## Modales

- Añadir participantes (pegar lista)
- Exportar