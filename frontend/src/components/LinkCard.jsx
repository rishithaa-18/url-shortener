import { useState } from 'react';
import { Link } from 'react-router-dom';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isExpired(iso) {
  return iso && new Date(iso) < new Date();
}

export default function LinkCard({ link, onToggleActive, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const expired = isExpired(link.expiresAt);
  const disabled = !link.isActive || expired;

  async function handleCopy() {
    await navigator.clipboard.writeText(link.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleToggle() {
    setBusy(true);
    try {
      await onToggleActive(link);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this link permanently? This cannot be undone.')) return;
    setBusy(true);
    try {
      await onDelete(link.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {/* Signature element: short code in mono with a colored underline,
              original URL de-emphasized beneath it — reads like a diff. */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={link.shortUrl}
              target="_blank"
              rel="noreferrer"
              className={`font-mono text-base font-medium underline decoration-2 underline-offset-4 ${
                disabled ? 'text-ink-soft decoration-line' : 'text-accent decoration-accent-soft hover:decoration-accent'
              }`}
            >
              {link.shortUrl.replace(/^https?:\/\//, '')}
            </a>

            {expired && (
              <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                Expired
              </span>
            )}
            {!link.isActive && !expired && (
              <span className="rounded-full bg-line px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                Disabled
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-sm text-ink-soft" title={link.originalUrl}>
            {link.originalUrl}
          </p>

          <p className="mt-2 text-xs text-ink-soft">
            Created {formatDate(link.createdAt)}
            {link.expiresAt && <> · Expires {formatDate(link.expiresAt)}</>}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={`/links/${link.id}/analytics`}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent"
          >
            Analytics
          </Link>
          <button
            onClick={handleCopy}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleToggle}
            disabled={busy}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {link.isActive ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-danger hover:border-danger disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
