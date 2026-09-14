// Public backend address only. Credentials remain in Vercel.
// The local development server keeps frontend and backend on the same origin.
window.NEXO_CONFIG = {
  apiBase: ['localhost', '127.0.0.1'].includes(location.hostname)
    ? location.origin
    : 'https://nexo-traduce.vercel.app',
};
