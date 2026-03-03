export default function PersonsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Title + action bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-52 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-28 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Header row */}
        <div className="flex gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
          {[120, 80, 100, 60, 80].map((w, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-gray-200"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-gray-100 px-4 py-3 last:border-0"
          >
            {[120, 80, 100, 60, 80].map((w, j) => (
              <div
                key={j}
                className="h-4 animate-pulse rounded bg-gray-100"
                style={{ width: w }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
