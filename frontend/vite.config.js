import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  css: {
    // Tailwind v4's @tailwindcss/vite plugin (above) processes all our CSS
    // directly — it does NOT need a traditional postcss.config.js, and this
    // project intentionally has none. But Vite's default behavior, if we
    // leave this unset, is to SEARCH for a postcss.config.* file starting
    // at the project root and walking upward through parent directories.
    // If any parent folder happens to contain a leftover postcss.config.js
    // from an unrelated project (e.g. from following an old Tailwind v3
    // tutorial, or a previous project sitting in Downloads), Vite will find
    // and apply it — running Tailwind v3-style PostCSS processing on top of
    // our v4 output and producing exactly this kind of directive-mismatch
    // error, even though our own project never asked for it.
    //
    // Passing an explicit (empty) object here tells Vite "here is your
    // PostCSS config" and skips that upward file search entirely. This is
    // the documented, version-agnostic fix — it doesn't depend on what is
    // or isn't sitting in any parent directory on a given machine.
    postcss: {},
  },
});
