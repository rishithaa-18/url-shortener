import { useLinks } from '../hooks/useLinks.js';
import CreateLinkForm from '../components/CreateLinkForm.jsx';
import LinkCard from '../components/LinkCard.jsx';

export default function Dashboard() {
  const { links, loading, error, createLink, toggleActive, removeLink } = useLinks();

  return (
    <div className="flex flex-col gap-6">
      <CreateLinkForm onCreate={createLink} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">
          {links.length > 0 ? `${links.length} link${links.length === 1 ? '' : 's'}` : 'Your links'}
        </h2>

        {loading && <p className="text-sm text-ink-soft">Loading your links…</p>}

        {error && (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            Couldn't load your links: {error}
          </p>
        )}

        {!loading && !error && links.length === 0 && (
          <div className="rounded-lg border border-dashed border-line bg-surface px-5 py-10 text-center">
            <p className="text-sm text-ink-soft">No links yet. Paste a URL above to create your first one.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <LinkCard key={link.id} link={link} onToggleActive={toggleActive} onDelete={removeLink} />
          ))}
        </div>
      </div>
    </div>
  );
}
