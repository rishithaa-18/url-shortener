// Every backend call goes through here. Why centralize this instead of
// calling fetch() directly in components: it's the one place that knows
// the backend's base URL, and the one place that turns our consistent
// { error: { code, message } } shape into a JS error components can catch
// without each of them re-parsing the response.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (res.status === 204) return null; // DELETE returns no body

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message || 'Something went wrong';
    const code = data?.error?.code || 'UNKNOWN_ERROR';
    throw new ApiError(message, res.status, code);
  }

  return data;
}

export const api = {
  createLink: (payload) => request('/api/links', { method: 'POST', body: JSON.stringify(payload) }),
  listLinks: () => request('/api/links'),
  getLink: (id) => request(`/api/links/${id}`),
  updateLink: (id, payload) => request(`/api/links/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteLink: (id) => request(`/api/links/${id}`, { method: 'DELETE' }),
  getAnalytics: (id) => request(`/api/links/${id}/analytics`),
};

export { ApiError, BASE_URL };
