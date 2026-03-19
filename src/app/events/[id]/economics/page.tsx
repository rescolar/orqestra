import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EconomicsService } from "@/lib/services/economics.service";

function formatMoney(value: number) {
  return `${value.toFixed(2)}€`;
}

export default async function EconomicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const ctx = { userId: session.user.id, role: session.user.role };

  let report;
  try {
    report = await EconomicsService.getEconomicReport(id, ctx);
  } catch {
    notFound();
  }

  const plannedBalance = report.income.expected - report.plannedCosts.total;

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link
              href={`/events/${id}/detail`}
              className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="size-4" />
              Volver al evento
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Informe económico</h1>
            <p className="mt-1 text-sm text-gray-500">
              {report.event.name}
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Ingresos esperados", value: report.income.expected, tone: "text-gray-900" },
            { label: "Cobrado", value: report.income.paid, tone: "text-emerald-700" },
            { label: "Pendiente", value: report.income.pending, tone: "text-amber-700" },
            { label: "Costes previstos", value: report.plannedCosts.total, tone: "text-rose-700" },
            { label: "Beneficio organización", value: report.plannedCosts.organizationProfit, tone: "text-sky-700" },
            { label: "Balance previsto", value: plannedBalance, tone: plannedBalance >= 0 ? "text-emerald-700" : "text-rose-700" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-400">{item.label}</p>
              <p className={`mt-2 text-xl font-semibold ${item.tone}`}>{formatMoney(item.value)}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ingresos de participantes</h2>
              <p className="text-sm text-gray-500">
                Basado en precios del evento y pagos reales registrados de participantes.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-gray-600">Total esperado</span>
                <span className="font-medium text-gray-900">{formatMoney(report.income.expected)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
                <span className="text-emerald-700">Total cobrado</span>
                <span className="font-medium text-emerald-700">{formatMoney(report.income.paid)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                <span className="text-amber-700">Pendiente de cobro</span>
                <span className="font-medium text-amber-700">{formatMoney(report.income.pending)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Totales previstos</h2>
              <p className="text-sm text-gray-500">
                Costes previstos y compromisos guardados desde el gestor de costes.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-gray-600">Honorarios facilitadores</span>
                <span className="font-medium text-gray-900">{formatMoney(report.plannedCosts.facilitatorFees)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-gray-600">Alojamiento facilitadores</span>
                <span className="font-medium text-gray-900">{formatMoney(report.plannedCosts.facilitatorLodging)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-gray-600">Costes del evento</span>
                <span className="font-medium text-gray-900">{formatMoney(report.plannedCosts.eventCosts)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-sky-50 px-4 py-3">
                <span className="text-sky-700">Beneficio organización previsto</span>
                <span className="font-medium text-sky-700">{formatMoney(report.plannedCosts.organizationProfit)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-rose-50 px-4 py-3">
                <span className="text-rose-700">Total costes previstos</span>
                <span className="font-medium text-rose-700">{formatMoney(report.plannedCosts.total)}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Facilitadores</h2>
              <p className="text-sm text-gray-500">
                Desglose de costes previstos por facilitador.
              </p>
            </div>
            {report.facilitatorLines.length === 0 ? (
              <p className="text-sm text-gray-500">No hay costes previstos de facilitadores guardados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="py-2 pr-3 font-medium">Facilitador</th>
                      <th className="py-2 pr-3 font-medium text-right">Honorarios</th>
                      <th className="py-2 pr-3 font-medium text-right">Alojamiento</th>
                      <th className="py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.facilitatorLines.map((line) => (
                      <tr key={line.eventPersonId} className="border-b border-gray-50 last:border-b-0">
                        <td className="py-3 pr-3 font-medium text-gray-800">{line.personName}</td>
                        <td className="py-3 pr-3 text-right text-gray-600">{formatMoney(line.feeTotal)}</td>
                        <td className="py-3 pr-3 text-right text-gray-600">{formatMoney(line.lodgingTotal)}</td>
                        <td className="py-3 text-right font-medium text-gray-900">{formatMoney(line.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Costes del evento</h2>
              <p className="text-sm text-gray-500">
                Costes previstos comunes y beneficio organización.
              </p>
            </div>
            {report.eventCostLines.length === 0 ? (
              <p className="text-sm text-gray-500">No hay costes previstos del evento guardados.</p>
            ) : (
              <div className="space-y-3">
                {report.eventCostLines.map((line, index) => (
                  <div key={`${line.category}-${line.title}-${index}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{line.title}</p>
                      <p className="text-xs text-gray-400">
                        {line.category === "organization_profit" ? "Beneficio organización previsto" : "Coste previsto del evento"}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900">{formatMoney(line.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
