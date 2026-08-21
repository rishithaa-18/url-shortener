import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listLinks();
      setLinks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createLink(payload) {
    const created = await api.createLink(payload);
    setLinks((prev) => [created, ...prev]);
    return created;
  }

  async function toggleActive(link) {
    const updated = await api.updateLink(link.id, { isActive: !link.isActive });
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, ...updated } : l)));
  }

  async function removeLink(id) {
    await api.deleteLink(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  return { links, loading, error, refresh, createLink, toggleActive, removeLink };
}
