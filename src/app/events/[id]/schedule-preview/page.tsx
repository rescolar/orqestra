import Link from "next/link";

const DAYS = [
  { label: "Día 1 (vie 7 mar)", active: true },
  { label: "Día 2 (sáb 8 mar)", active: false },
  { label: "Día 3 (dom 9 mar)", active: false },
];

const BLOCKS = [
  {
    type: "common" as const,
    activities: [
      {
        title: "Ceremonia de apertura",
        time: "09:00–10:00",
        description:
          "Bienvenida, presentación del programa y dinámica de integración grupal.",
      },
    ],
  },
  {
    type: "parallel" as const,
    activities: [
      {
        title: "Taller de meditación",
        time: "10:30–12:00",
        description: "Introducción a técnicas de meditación mindfulness.",
        signups: 12,
      },
      {
        title: "Yoga al aire libre",
        time: "10:30–12:00",
        description: "Sesión de hatha yoga en el jardín del centro.",
        signups: 8,
      },
    ],
  },
  {
    type: "common" as const,
    activities: [
      {
        title: "Almuerzo",
        time: "13:00–14:30",
        description: "Almuerzo comunitario en el comedor principal.",
      },
    ],
  },
  {
    type: "parallel" as const,
    activities: [
      {
        title: "Círculo de palabra",
        time: "15:00–16:30",
        description: "Espacio de escucha y compartir en grupo reducido.",
        signups: 6,
      },
      {
        title: "Caminata consciente",
        time: "15:00–16:30",
        description: "Paseo guiado por los senderos del centro.",
        signups: 10,
      },
      {
        title: "Taller de escritura",
        time: "15:00–16:30",
        description: "Ejercicios de escritura creativa y reflexión personal.",
        signups: 4,
      },
    ],
  },
];

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`}>
      {name}
    </span>
  );
}

function BlockControls() {
  return (
    <div className="flex items-center gap-1">
      <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
        <Icon name="expand_less" className="text-lg" />
      </button>
      <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
        <Icon name="expand_more" className="text-lg" />
      </button>
      <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-danger">
        <Icon name="delete" className="text-lg" />
      </button>
    </div>
  );
}

function OrganizerView() {
  return (
    <section>
      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium text-primary">
          <Icon name="visibility" className="mr-1 align-middle text-base" />
          Vista del organizador
        </p>
      </div>

      {/* Day tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {DAYS.map((day) => (
          <button
            key={day.label}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              day.active
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        {BLOCKS.map((block, i) => (
          <div key={i} className="rounded-2xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 uppercase">
                {block.type === "common" ? "Común" : "Paralelo"}
              </span>
              <BlockControls />
            </div>

            {block.type === "common" ? (
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {block.activities[0].title}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-500">
                      <Icon
                        name="schedule"
                        className="mr-1 align-middle text-sm"
                      />
                      {block.activities[0].time}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {block.activities[0].description}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`grid gap-3 ${
                  block.activities.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
                }`}
              >
                {block.activities.map((act, j) => (
                  <div
                    key={j}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <h3 className="font-semibold text-gray-900">{act.title}</h3>
                    <p className="mt-0.5 text-sm text-gray-500">
                      <Icon
                        name="schedule"
                        className="mr-1 align-middle text-sm"
                      />
                      {act.time}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {act.description}
                    </p>
                    {"signups" in act && (
                      <p className="mt-3 text-xs font-medium text-primary">
                        <Icon
                          name="group"
                          className="mr-1 align-middle text-sm"
                        />
                        {act.signups} inscritos
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add block buttons */}
      <div className="mt-6 flex gap-3">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-primary hover:text-primary">
          <Icon name="add" className="text-lg" />
          Añadir bloque común
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-primary hover:text-primary">
          <Icon name="add" className="text-lg" />
          Añadir bloque paralelo
        </button>
      </div>
    </section>
  );
}

function ParticipantView() {
  const selectedActivity = "Yoga al aire libre";

  return (
    <section>
      <div className="mb-6 rounded-xl border border-accent/20 bg-accent/5 p-4">
        <p className="text-sm font-medium text-accent">
          <Icon name="person" className="mr-1 align-middle text-base" />
          Vista del participante
        </p>
      </div>

      {/* Day tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {DAYS.map((day) => (
          <button
            key={day.label}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              day.active
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {BLOCKS.map((block, i) => {
          if (block.type === "common") {
            return (
              <div key={i} className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-semibold text-gray-900">
                  {block.activities[0].title}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  <Icon
                    name="schedule"
                    className="mr-1 align-middle text-sm"
                  />
                  {block.activities[0].time}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {block.activities[0].description}
                </p>
              </div>
            );
          }

          return (
            <div key={i}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                Elige una actividad
              </p>
              <div
                className={`grid gap-3 ${
                  block.activities.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
                }`}
              >
                {block.activities.map((act, j) => {
                  const isSelected = act.title === selectedActivity;
                  return (
                    <div
                      key={j}
                      className={`rounded-2xl border-2 p-4 transition-colors ${
                        isSelected
                          ? "border-success bg-success/5"
                          : "border-gray-200 bg-white hover:border-primary/30"
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900">
                        {act.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-gray-500">
                        <Icon
                          name="schedule"
                          className="mr-1 align-middle text-sm"
                        />
                        {act.time}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {act.description}
                      </p>
                      {"signups" in act && (
                        <p className="mt-2 text-xs text-gray-400">
                          {act.signups} inscritos
                        </p>
                      )}
                      <button
                        className={`mt-3 w-full rounded-lg py-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-success text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Icon
                              name="check"
                              className="mr-1 align-middle text-sm"
                            />
                            Apuntado
                          </>
                        ) : (
                          "Unirme"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function SchedulePreviewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="#"
            className="flex items-center justify-center rounded-lg bg-primary p-2 text-white"
          >
            <span className="material-symbols-outlined text-xl">
              grid_view
            </span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-primary">
              Retiro de Primavera 2025
            </h1>
            <p className="text-sm text-gray-400">7–9 mar 2025 · Programa</p>
          </div>
        </div>
        <Link
          href="#"
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Icon name="arrow_back" className="text-base" />
          Tablero
        </Link>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <OrganizerView />

        <hr className="my-12 border-gray-300" />

        <ParticipantView />
      </div>
    </div>
  );
}
