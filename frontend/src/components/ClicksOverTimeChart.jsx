import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function formatDateLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ClicksOverTimeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-line bg-surface">
        <p className="text-sm text-ink-soft">No clicks yet — this chart fills in once people start visiting the link.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({ date: d.date, count: d.count, label: formatDateLabel(d.date) }));

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h3 className="mb-4 text-sm font-medium text-ink-soft">Clicks over time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e8a83" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0e8a83" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e4de" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#57534e' }} axisLine={{ stroke: '#e7e4de' }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#57534e' }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e7e4de', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}
            labelFormatter={(label) => label}
            formatter={(value) => [value, 'clicks']}
          />
          <Area type="monotone" dataKey="count" stroke="#0e8a83" strokeWidth={2} fill="url(#clicksGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
