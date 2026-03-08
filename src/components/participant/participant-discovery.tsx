"use client";

type Participant = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  status: string;
};

export function ParticipantDiscovery({
  participants,
}: {
  participants: Participant[];
}) {
  if (participants.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">
        Participantes ({participants.length})
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-xl border bg-white p-2"
          >
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.avatarUrl}
                alt={p.name}
                className="size-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {p.initials}
              </div>
            )}
            <span className="truncate text-sm text-gray-700">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
