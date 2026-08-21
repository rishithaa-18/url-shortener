import { useState } from 'react';
import { ApiError } from '../api/client.js';

const initialState = { originalUrl: '', customAlias: '', expiresAt: '' };

export default function CreateLinkForm({ onCreate }) {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = { originalUrl: form.originalUrl.trim() };
      if (form.customAlias.trim()) payload.customAlias = form.customAlias.trim();
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();

      await onCreate(payload);
      setForm(initialState);
      setShowAdvanced(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the link. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          required
          placeholder="Paste a long URL to shorten"
          value={form.originalUrl}
          onChange={(e) => update('originalUrl', e.target.value)}
          className="flex-1 rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-accent"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Shortening…' : 'Shorten'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-3 text-xs font-medium text-ink-soft underline decoration-line underline-offset-4 hover:text-accent"
      >
        {showAdvanced ? 'Hide options' : 'Custom alias or expiration'}
      </button>

      {showAdvanced && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-ink-soft">
            Custom alias
            <input
              type="text"
              placeholder="my-link"
              value={form.customAlias}
              onChange={(e) => update('customAlias', e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-soft focus:border-accent"
            />
          </label>
          <label className="text-xs text-ink-soft">
            Expires at
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => update('expiresAt', e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-accent"
            />
          </label>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}
    </form>
  );
}
