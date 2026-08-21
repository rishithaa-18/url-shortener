function shortenReferrer(ref) {
  if (ref === 'direct') return 'Direct / no referrer';
  try {
    return new URL(ref).hostname;
  } catch {
    return ref;
  }
}

export default function ReferrersList({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-5">
        <h3 className="mb-3 text-sm font-medium text-ink-soft">Top referrers</h3>
        <p className="text-sm text-ink-soft">No data yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h3 className="mb-3 text-sm font-medium text-ink-soft">Top referrers</h3>
      <ul className="flex flex-col divide-y divide-line">
        {data.map((row) => (
          <li key={row.referrer} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
            <span className="truncate font-mono text-ink" title={row.referrer}>
              {shortenReferrer(row.referrer)}
            </span>
            <span className="ml-3 shrink-0 font-mono text-xs text-ink-soft">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
