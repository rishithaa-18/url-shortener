import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';

export function useAnalytics(linkId) {
  const [link, setLink] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        // Fetched together: the link itself (for display context — short
        // code, original URL) and its analytics (the actual numbers).
        const [linkData, analyticsData] = await Promise.all([
          api.getLink(linkId),
          api.getAnalytics(linkId),
        ]);
        if (!cancelled) {
          setLink(linkData);
          setAnalytics(analyticsData);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [linkId]);

  return { link, analytics, loading, error, notFound };
}
