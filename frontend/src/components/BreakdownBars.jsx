// One reusable component instead of four near-identical chart components —
// device, browser, OS, and country breakdowns are all "label + count, sorted
// descending" and read better as simple horizontal bars than as four
// separate pie charts, which would compete for attention against each other.

export default function BreakdownBars({ title, data, labelKey }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-5">
        <h3 className="mb-3 text-sm font-medium text-ink-soft">{title}</h3>
        <p className="text-sm text-ink-soft">No data yet.</p>
      </div>
    );
  }

  const total = data.reduce((sum, row) => sum + row.count, 0);
  const top = data.slice(0, 6);

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h3 className="mb-3 text-sm font-medium text-ink-soft">{title}</h3>
      <div className="flex flex-col gap-2.5">
        {top.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row[labelKey]}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="capitalize text-ink">{row[labelKey]}</span>
                <span className="font-mono text-xs text-ink-soft">
                  {row.count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper">
                <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
