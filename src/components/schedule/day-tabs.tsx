type DayTabsProps = {
  days: { day_index: number; date: Date }[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
};

function formatDayTab(date: Date, index: number) {
  const d = new Date(date);
  const weekday = d.toLocaleDateString("es-ES", { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("es-ES", { month: "short" });
  return `Día ${index + 1} (${weekday} ${day} ${month})`;
}

export function DayTabs({ days, selectedDay, onSelectDay }: DayTabsProps) {
  return (
    <div className="flex gap-1 border-b bg-white px-6 pt-3">
      {days.map((d) => (
        <button
          key={d.day_index}
          onClick={() => onSelectDay(d.day_index)}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
            selectedDay === d.day_index
              ? "border-b-2 border-primary bg-surface text-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {formatDayTab(d.date, d.day_index)}
        </button>
      ))}
    </div>
  );
}
