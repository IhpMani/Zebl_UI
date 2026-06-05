/** User-facing message from an HTTP error; never surfaces EF/LINQ/runtime internals. */
export function friendlyApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { status?: number; error?: unknown; message?: string };
  if (e?.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (e?.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (e?.status === 0) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  const raw = extractRawMessage(e?.error) ?? (typeof e?.message === 'string' ? e.message : null);
  if (!raw) {
    return fallback;
  }
  if (isInternalDiagnostic(raw)) {
    return fallback;
  }
  return raw.length > 200 ? `${raw.slice(0, 197)}…` : raw;
}

function extractRawMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    return body;
  }
  if (body && typeof body === 'object') {
    const o = body as { error?: string; message?: string; Message?: string; title?: string };
    return o.error ?? o.message ?? o.Message ?? o.title ?? null;
  }
  return null;
}

function isInternalDiagnostic(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('client projection') ||
    t.includes('constant expression') ||
    t.includes('ef core') ||
    t.includes('entity framework') ||
    t.includes('linq') ||
    t.includes('sqlexception') ||
    t.includes('stack trace') ||
    t.includes(' at zebl.') ||
    t.includes(' at microsoft.')
  );
}
