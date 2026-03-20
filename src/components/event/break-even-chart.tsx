"use client";

const CHART_W = 1000;
const CHART_H = 520;
const PAD = { top: 40, right: 40, bottom: 70, left: 110 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function formatMoney(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k€`;
  return `${v.toFixed(0)}€`;
}

export function BreakEvenChart({
  marginPerParticipant,
  costsWithoutProfit,
  costsWithProfit,
  estimatedParticipants,
}: {
  marginPerParticipant: number;
  costsWithoutProfit: number;
  costsWithProfit: number;
  estimatedParticipants: number;
}) {
  const breakEvenCosts = marginPerParticipant > 0 ? Math.ceil(costsWithoutProfit / marginPerParticipant) : 0;
  const breakEvenProfit = marginPerParticipant > 0 ? Math.ceil(costsWithProfit / marginPerParticipant) : 0;

  // X axis: 0 to max participants (at least estimated + 20% or breakEvenProfit + 20%)
  const xMax = Math.max(estimatedParticipants, breakEvenProfit, 10) * 1.2;
  const maxParticipants = Math.ceil(xMax);

  // Y axis: 0 to max of (costsWithProfit, margin at maxParticipants)
  const maxMargin = marginPerParticipant * maxParticipants;
  const yMax = Math.max(costsWithProfit, maxMargin) * 1.1;

  const xScale = (v: number) => PAD.left + (v / maxParticipants) * INNER_W;
  const yScale = (v: number) => PAD.top + INNER_H - (v / yMax) * INNER_H;

  // Margin line: from (0,0) to (maxParticipants, maxMargin)
  const marginX1 = xScale(0);
  const marginY1 = yScale(0);
  const marginX2 = xScale(maxParticipants);
  const marginY2 = yScale(maxMargin);

  // Cost lines
  const costY = yScale(costsWithoutProfit);
  const profitY = yScale(costsWithProfit);

  // Break-even points
  const beCostX = xScale(breakEvenCosts);
  const beProfitX = xScale(breakEvenProfit);

  // Estimated participants vertical
  const estX = xScale(estimatedParticipants);

  // Show two separate thresholds only when org profit > 0
  const hasTwoThresholds = costsWithProfit > costsWithoutProfit;

  // Y axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
  // X axis ticks
  const xStep = Math.max(1, Math.ceil(maxParticipants / 6));
  const xTicks: number[] = [];
  for (let i = 0; i <= maxParticipants; i += xStep) xTicks.push(i);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full max-w-[1000px]"
        aria-label="Gráfica de punto de equilibrio"
      >
        {/* Grid lines */}
        {yTicks.map((v) => (
          <line
            key={`yg-${v}`}
            x1={PAD.left}
            y1={yScale(v)}
            x2={PAD.left + INNER_W}
            y2={yScale(v)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + INNER_H} stroke="#9ca3af" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + INNER_H} x2={PAD.left + INNER_W} y2={PAD.top + INNER_H} stroke="#9ca3af" strokeWidth={1} />

        {/* Y axis labels */}
        {yTicks.map((v) => (
          <text
            key={`yl-${v}`}
            x={PAD.left - 6}
            y={yScale(v) + 3}
            textAnchor="end"
            className="fill-gray-400"
            fontSize={18}
          >
            {formatMoney(v)}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map((v) => (
          <text
            key={`xl-${v}`}
            x={xScale(v)}
            y={PAD.top + INNER_H + 30}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize={18}
          >
            {v}
          </text>
        ))}

        {/* X axis title */}
        <text
          x={PAD.left + INNER_W / 2}
          y={CHART_H - 4}
          textAnchor="middle"
          className="fill-gray-500"
          fontSize={20}
        >
          Participantes
        </text>

        {/* Profit zone (green fill below margin line, above cost line, right of break-even) */}
        {breakEvenCosts < maxParticipants && (
          <polygon
            points={`${beCostX},${costY} ${marginX2},${marginY2} ${marginX2},${costY}`}
            fill="#10b981"
            opacity={0.08}
          />
        )}

        {/* Loss zone (red fill above margin line, below cost line, left of break-even) */}
        {breakEvenCosts > 0 && (
          <polygon
            points={`${marginX1},${costY} ${beCostX},${costY} ${marginX1},${marginY1}`}
            fill="#ef4444"
            opacity={0.08}
          />
        )}

        {/* Costs line (horizontal, dashed red) */}
        <line
          x1={PAD.left}
          y1={costY}
          x2={PAD.left + INNER_W}
          y2={costY}
          stroke="#ef4444"
          strokeWidth={2.5}
          strokeDasharray="12 6"
        />
        <text
          x={PAD.left + INNER_W + 2}
          y={costY - 8}
          className="fill-rose-600"
          fontSize={16}
          textAnchor="end"
        >
          Cubrir gastos
        </text>

        {/* Costs + profit line (horizontal, dashed sky) — only if different from costs */}
        {hasTwoThresholds && (
          <>
            <line
              x1={PAD.left}
              y1={profitY}
              x2={PAD.left + INNER_W}
              y2={profitY}
              stroke="#0ea5e9"
              strokeWidth={2.5}
              strokeDasharray="12 6"
            />
            <text
              x={PAD.left + INNER_W + 2}
              y={profitY - 8}
              className="fill-sky-600"
              fontSize={16}
              textAnchor="end"
            >
              Beneficio mínimo
            </text>
          </>
        )}

        {/* Margin line */}
        <line
          x1={marginX1}
          y1={marginY1}
          x2={marginX2}
          y2={marginY2}
          stroke="#10b981"
          strokeWidth={3}
        />
        <text
          x={marginX2 - 2}
          y={marginY2 - 6}
          className="fill-emerald-600"
          fontSize={16}
          textAnchor="end"
        >
          Margen acumulado
        </text>

        {/* Estimated participants vertical line */}
        <line
          x1={estX}
          y1={PAD.top}
          x2={estX}
          y2={PAD.top + INNER_H}
          stroke="#6b7280"
          strokeWidth={1}
          strokeDasharray="6 6"
          opacity={0.5}
        />
        <text
          x={estX}
          y={PAD.top - 12}
          textAnchor="middle"
          className="fill-gray-400"
          fontSize={16}
        >
          Estimados ({estimatedParticipants})
        </text>

        {/* Break-even costs point */}
        <circle cx={beCostX} cy={costY} r={7} fill="#f59e0b" stroke="#fff" strokeWidth={2.5} />
        <text
          x={beCostX}
          y={costY - 16}
          textAnchor="middle"
          className="fill-amber-700"
          fontSize={18}
          fontWeight={600}
        >
          {breakEvenCosts} pers.
        </text>

        {/* Break-even profit point — only if different */}
        {hasTwoThresholds && (
          <>
            <circle cx={beProfitX} cy={profitY} r={7} fill="#f59e0b" stroke="#fff" strokeWidth={2.5} />
            <text
              x={beProfitX}
              y={profitY - 16}
              textAnchor="middle"
              className="fill-amber-700"
              fontSize={18}
              fontWeight={600}
            >
              {breakEvenProfit} pers.
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
