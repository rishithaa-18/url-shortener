import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
            <Link to="/" className="inline-flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-ink">snip</span>
              <span className="text-xs text-ink-soft">links &amp; analytics</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/links/:id/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
