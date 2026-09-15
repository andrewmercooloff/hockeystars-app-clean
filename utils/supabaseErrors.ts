/** True when Supabase/PostgREST reports that a row does not exist. */
export function isNotFoundSupabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = String((error as { code?: string }).code ?? '');
  if (code === 'PGRST116') return true;
  const msg = String((error as { message?: string }).message ?? '').toLowerCase();
  return msg.includes('0 rows') || msg.includes('not found');
}

/**
 * Network, billing, timeout, 5xx — anything that must NOT be treated as "user deleted"
 * or trigger logout.
 */
export function isTransientSupabaseError(error: unknown): boolean {
  if (!error) return false;
  if (isNotFoundSupabaseError(error)) return false;

  const code = String((error as { code?: string }).code ?? '');
  const msg = String((error as { message?: string }).message ?? error).toLowerCase();
  const status = Number((error as { status?: number }).status);

  if (code.startsWith('PGRST0') && code !== 'PGRST116') return true;
  if (status >= 500 || status === 402 || status === 403 || status === 429) return true;

  const transientHints = [
    'network request failed',
    'network error',
    'fetch failed',
    'failed to fetch',
    'timeout',
    'timed out',
    'econnrefused',
    'enotfound',
    'socket',
    'abort',
    'service unavailable',
    'bad gateway',
    'gateway timeout',
    'payment required',
    'exceeded',
    'quota',
    'project is paused',
    'paused',
    'maintenance',
    'jwt',
  ];

  return transientHints.some((hint) => msg.includes(hint));
}

