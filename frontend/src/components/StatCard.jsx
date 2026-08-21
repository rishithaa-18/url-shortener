export default function StatCard({ label, value, mono = true }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-2 text-3xl font-semibold text-ink ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
