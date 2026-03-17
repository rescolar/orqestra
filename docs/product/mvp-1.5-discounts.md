# MVP 1.5 — Descuentos por estancia parcial y comidas

## Contexto

El precio del evento por tipo de habitación (MVP 1.4) ya funciona. Pero no todos los participantes disfrutan del evento completo: algunos llegan tarde, se van antes, o no se alojan. El organizador necesita calcular descuentos de forma trazable para saber exactamente qué falta por cobrar.

**Modelo actual**: `RoomPricing.price` = precio total del evento. `EventPerson.amount_paid` = lo pagado. No hay forma de calcular descuentos ni de saber el precio ajustado.

**Objetivo**: Añadir tarifas de referencia (coste centro/día por tipo hab., coste comidas general) + tracking de estancia parcial por participante → cálculo automático de descuentos → "falta por cobrar" preciso.

## Modelo de datos

### Cambios en `RoomPricing`
```prisma
model RoomPricing {
  // Existentes:
  price                Decimal  @db.Decimal(10, 2)  // Precio total evento
  // Nuevo:
  daily_rate           Decimal? @db.Decimal(10, 2)  // Coste centro por día (para descuento)
}
```

### Cambios en `Event`
```prisma
// Nuevos campos (tarifas de comida generales):
meal_cost_breakfast   Decimal? @db.Decimal(10, 2)
meal_cost_lunch       Decimal? @db.Decimal(10, 2)
meal_cost_dinner      Decimal? @db.Decimal(10, 2)
```

### Cambios en `EventPerson`
```prisma
// Estancia parcial:
date_arrival          DateTime?  // null = event.date_start
date_departure        DateTime?  // null = event.date_end

// Descuento comidas (nº de comidas a descontar):
discount_breakfast    Int @default(0)
discount_lunch        Int @default(0)
discount_dinner       Int @default(0)
```

## Cálculos derivados (UI, no en BD)

```
event_days = diff(event.date_end, event.date_start)
person_days = diff(date_departure ?? event.date_end, date_arrival ?? event.date_start)
days_discount = event_days - person_days

day_discount_amount = days_discount × RoomPricing.daily_rate
meal_discount_amount = (discount_breakfast × meal_cost_breakfast)
                     + (discount_lunch × meal_cost_lunch)
                     + (discount_dinner × meal_cost_dinner)

total_discount = day_discount_amount + meal_discount_amount
amount_owed = RoomPricing.price - total_discount
pending = amount_owed - amount_paid
```

Si `daily_rate` o `meal_cost_*` son null → ese componente de descuento = 0 (no se aplica).

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Añadir campos a RoomPricing, Event, EventPerson |
| `src/components/room-setup-form.tsx` | Columna "Coste/día" junto a "Precio €" cuando pricing_by_room_type |
| `src/components/event/event-detail-form.tsx` | Campos coste comidas (desayuno, comida, cena) + coste/día en tabla room pricings |
| `src/lib/actions/event.ts` | Extender updateEventDetails y updateRoomPricings con nuevos campos |
| `src/lib/services/event.service.ts` | Extender createRoomsFromTypes, getRoomPricings, updateRoomPricings |
| `src/components/board/person-detail-panel.tsx` | Sección "Descuentos" en panel de pago: fechas, comidas, cálculo |
| `src/lib/services/person.service.ts` | Incluir nuevos campos en getEventPerson |
| `src/components/reception/reception-client.tsx` | Actualizar resolvePrice → resolveAmountOwed con descuentos |
| `src/components/reception/participant-row.tsx` | Mostrar descuento y pendiente real |
| `src/components/reception/reception-print-client.tsx` | Columnas descuento en print |
| `src/lib/services/reception.service.ts` | Incluir nuevos campos + tarifas comida en query |

## Implementación por pasos

### Paso 1: Schema
- `RoomPricing`: añadir `daily_rate Decimal? @db.Decimal(10, 2)`
- `Event`: añadir `meal_cost_breakfast`, `meal_cost_lunch`, `meal_cost_dinner` (Decimal?, 10,2)
- `EventPerson`: añadir `date_arrival DateTime?`, `date_departure DateTime?`, `discount_breakfast Int @default(0)`, `discount_lunch Int @default(0)`, `discount_dinner Int @default(0)`

### Paso 2: Room setup form
- Añadir columna "Coste/día €" en la tabla de tipos cuando `pricingByRoomType` está activo
- `RoomType` se extiende con `dailyRate?: number`
- Al crear rooms, pasar `dailyRate` al service

### Paso 3: Event detail form
- Añadir sección "Tarifas de comida" con 3 campos: desayuno, comida, cena (€)
- Visible siempre (independiente de pricing_by_room_type, porque las comidas pueden descontarse incluso con precio fijo)
- En tabla de room pricings: añadir columna "Coste/día" editable inline
- Guardar nuevos campos en `updateEventDetails` y `updateRoomPricings`

### Paso 4: Person detail panel — sección Descuentos
- Dentro de la sección "Pago" (colapsable), añadir subsección "Descuentos" si hay tarifas configuradas
- **Fechas estancia**: date pickers para llegada/salida (default = fechas evento)
  - Si difieren de las del evento → mostrar "X días menos → -Y€"
- **Comidas**: 3 inputs numéricos (nº desayunos, comidas, cenas a descontar)
  - Mostrar cálculo: "2 desayunos × 8€ = -16€"
- **Resumen descuento**: total descuento, precio ajustado, pagado, pendiente
- Auto-save on blur (patrón existente)
- El auto-fill de `amount_paid` al cambiar status usa `amount_owed` (precio - descuentos) en vez de `price`

### Paso 5: Reception report
- `resolvePrice` → `resolveAmountOwed(person, pricing, eventDates, mealCosts)`
- Incluir descuento en KPIs: total esperado = Σ amount_owed (no Σ price)
- CSV: añadir columnas "Descuento", "Precio ajustado"
- Print: columna "Desc." y "Ajustado" en tabla de control

### Paso 6: Service + actions
- `getEventPerson`: incluir `date_arrival`, `date_departure`, `discount_breakfast/lunch/dinner`
- `updateEventPerson`: aceptar nuevos campos
- `createRoomsFromTypes`: aceptar `dailyRate` por tipo
- `getRoomPricings`: incluir `daily_rate`
- `updateRoomPricings`: aceptar `daily_rate`
- `updateEventDetails`: aceptar `meal_cost_*`
- `getReceptionReport`: incluir meal costs del evento + campos descuento del participante

## UX en el panel de pago (person detail)

```
┌─ Pago ─────────────────────────────────┐
│ Precio habitación:           350,00 €  │
│                                        │
│ ▸ Descuentos                           │
│   Llegada: [15/mar] Salida: [17/mar]   │
│   1 día menos × 80€/día    = -80,00 € │
│   Desayunos: [1] × 8€      =  -8,00 € │
│   Comidas:   [0] × 12€     =   0,00 € │
│   Cenas:     [1] × 10€     = -10,00 € │
│   Total descuento:           -98,00 €  │
│                                        │
│ Precio ajustado:             252,00 €  │
│ ████████████░░░░  150 / 252 €          │
│ Importe pagado: [150,00]               │
│ Pendiente:                   102,00 €  │
│ Nota: [________________]              │
└────────────────────────────────────────┘
```

## Decisiones de diseño

- **`date_arrival`/`date_departure` null** = fechas del evento (sin descuento). Solo se rellenan si difieren.
- **Descuentos de comida en 0** = sin descuento. El organizador solo rellena si aplica.
- **Precio fijo (sin pricing_by_room_type)**: los descuentos de comida siguen funcionando contra `event_price`. El descuento de días no aplica (no hay `daily_rate`).
- **Compatibilidad**: `amount_owed = price - discounts`. Si no hay descuentos configurados, `amount_owed = price` (comportamiento actual).
- **`arrives_for_dinner` / `last_meal_lunch`** siguen siendo para cocina (logística), separados del descuento financiero. Podrían estar relacionados pero son conceptos distintos.

## Verificación

1. Crear evento con pricing_by_room_type → rellenar daily_rate por tipo → verificar que se guarda
2. Rellenar costes de comida en detalles → verificar que se guardan
3. En board: abrir panel de participante → poner fechas de estancia distintas → verificar cálculo de descuento por días
4. Añadir descuentos de comida → verificar cálculo total
5. Cambiar status a "pagado" → verificar que auto-fill usa amount_owed (no price)
6. Reception report: verificar que KPIs y CSV usan amount_owed
7. Evento con precio fijo: verificar que descuentos de comida funcionan sin daily_rate
