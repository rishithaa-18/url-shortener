import { Link, useParams } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics.js';
import StatCard from '../components/StatCard.jsx';
import ClicksOverTimeChart from '../components/ClicksOverTimeChart.jsx';
import BreakdownBars from '../components/BreakdownBars.jsx';
import ReferrersList from '../components/ReferrersList.jsx';

export default function Analytics() {
  const { id } = useParams();
  const { link, analytics, loading, error, notFound } = useAnalytics(id);

  if (loading) {
    return <p className="text-sm text-ink-soft">Loading analytics…</p>;
  }

  if (notFound) {
    return (
      <div>
        <Link to="/" className="text-sm text-accent hover:underline">
          ← Back to links
        </Link>
        <div className="mt-4 rounded-lg border border-dashed border-line bg-surface px-5 py-10 text-center">
          <p className="text-sm text-ink-soft">This link doesn't exist, or has already been deleted.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link to="/" className="text-sm text-accent hover:underline">
          ← Back to links
        </Link>
        <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          Couldn't load analytics: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/" className="text-sm text-accent hover:underline">
          ← Back to links
        </Link>
        <h1 className="mt-2 font-mono text-lg font-medium text-ink">
          {link.shortUrl.replace(/^https?:\/\//, '')}
        </h1>
        <p className="mt-1 truncate text-sm text-ink-soft">{link.originalUrl}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total clicks" value={analytics.totalClicks} />
        <StatCard label="Status" value={link.isActive ? 'Active' : 'Disabled'} mono={false} />
        <StatCard
          label="Created"
          value={new Date(link.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          mono={false}
        />
      </div>

      <ClicksOverTimeChart data={analytics.clicksOverTime} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BreakdownBars title="Devices" data={analytics.deviceBreakdown} labelKey="device_type" />
        <BreakdownBars title="Browsers" data={analytics.browserBreakdown} labelKey="browser" />
        <BreakdownBars title="Operating systems" data={analytics.osBreakdown} labelKey="os" />
        <BreakdownBars title="Countries" data={analytics.countryBreakdown} labelKey="country" />
      </div>

      <ReferrersList data={analytics.topReferrers} />
    </div>
  );
}
