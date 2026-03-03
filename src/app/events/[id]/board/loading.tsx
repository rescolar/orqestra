export default function BoardLoading() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      {/* Header bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-3">
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 shrink-0 border-r border-gray-200 bg-white p-3">
          <div className="mb-3 h-9 w-full animate-pulse rounded bg-gray-100" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded-lg bg-gray-100"
              />
            ))}
          </div>
        </div>

        {/* Center grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-gray-200 bg-white"
              >
                <div className="h-3 rounded-t-2xl bg-gray-200" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/3 rounded bg-gray-100" />
                  <div className="mt-2 space-y-1">
                    <div className="h-6 w-full rounded bg-gray-50" />
                    <div className="h-6 w-full rounded bg-gray-50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
