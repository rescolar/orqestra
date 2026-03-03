export default function DetailLoading() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
              <div className="hidden h-4 w-16 animate-pulse rounded bg-gray-200 sm:block" />
              {n < 3 && <div className="h-px w-8 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Title + subtitle */}
        <div className="mb-6">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>

        {/* Form card */}
        <div className="animate-pulse space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="h-10 w-full rounded bg-gray-100" />
          <div className="h-10 w-full rounded bg-gray-100" />
          <div className="h-24 w-full rounded bg-gray-100" />
          <div className="h-10 w-1/2 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
