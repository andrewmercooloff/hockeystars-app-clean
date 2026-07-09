/**
 * Fallback proxy if Supabase Custom Domain still resolves to blocked Cloudflare IPs.
 * Deploy on api.hockey-stars.com ONLY after removing Supabase CNAME to *.supabase.co.
 */
const SUPABASE_ORIGIN = 'https://jvsypfwiajuwsyuzkyda.supabase.co';

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, SUPABASE_ORIGIN);

    const headers = new Headers(request.headers);
    headers.set('Host', 'jvsypfwiajuwsyuzkyda.supabase.co');

    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }

    return fetch(target.toString(), init);
  },
};
