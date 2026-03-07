import { getAdminStats, getAllEvents } from "@/lib/actions/admin";

export default async function AdminDashboard() {
  const [stats, events] = await Promise.all([
    getAdminStats(),
    getAllEvents(),
  ]);

  const recentEvents = events.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel de administración</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Organizadores</p>
          <p className="text-3xl font-bold text-gray-900">{stats.userCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Eventos</p>
          <p className="text-3xl font-bold text-gray-900">{stats.eventCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-500">Personas</p>
          <p className="text-3xl font-bold text-gray-900">{stats.personCount}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Eventos recientes</h2>
      {recentEvents.length === 0 ? (
        <p className="text-gray-500">No hay eventos</p>
      ) : (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Organizador</th>
                <th className="px-4 py-3 font-medium">Fechas</th>
                <th className="px-4 py-3 font-medium text-right">Participantes</th>
                <th className="px-4 py-3 font-medium text-right">Habitaciones</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{event.name}</td>
                  <td className="px-4 py-3 text-gray-600">{event.user.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(event.date_start).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    {" – "}
                    {new Date(event.date_end).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{event._count.event_persons}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{event._count.rooms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
