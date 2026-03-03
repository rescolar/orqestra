export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Title */}
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />

      {/* Event cards grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white"
          >
            {/* Thumbnail */}
            <div className="h-36 bg-gray-200" />
            {/* Text lines */}
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-1/3 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
