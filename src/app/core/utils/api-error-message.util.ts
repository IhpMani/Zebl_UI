/** User-facing message from an HTTP error; never surfaces EF/LINQ/runtime internals. */

const FRIENDLY_ERROR_CODES: Record<string, string> = {

  INVALID_FACILITY:

    'The selected facility is invalid or you do not have access to it.',

  DUPLICATE_FACILITY_NAME:

    'A facility with this name already exists in your practice.',

  DUPLICATE_FACILITY_CODE: 'A facility with this code already exists in your practice.',

  DUPLICATE_FACILITY:

    'A facility with this name already exists in your practice.',

  FACILITY_ACCESS_DENIED:

    'You do not have access to the selected facility.',

  TENANT_FACILITY_MISMATCH:

    'The facility ID does not belong to your practice.',

};



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



  const body = e?.error;

  const errorCode =

    body && typeof body === 'object'

      ? (body as { errorCode?: string }).errorCode

      : undefined;

  const mapped =

    typeof errorCode === 'string' ? FRIENDLY_ERROR_CODES[errorCode] : undefined;



  const raw =

    mapped ??

    extractRawMessage(body) ??

    (typeof e?.message === 'string' ? e.message : null);

  if (!raw) {

    return fallback;

  }

  if (isInternalDiagnostic(raw)) {

    return fallback;

  }



  const details =

    body && typeof body === 'object'

      ? (body as { details?: string; Details?: string }).details ??

        (body as { Details?: string }).Details

      : undefined;

  const base = raw.length > 200 ? `${raw.slice(0, 197)}…` : raw;

  if (typeof details === 'string' && details.trim()) {

    return `${base} ${details.trim()}`;

  }

  return base;

}



function extractRawMessage(body: unknown): string | null {

  if (typeof body === 'string') {

    return body;

  }

  if (body && typeof body === 'object') {

    const o = body as {

      error?: string;

      message?: string;

      Message?: string;

      title?: string;

      errors?: Record<string, string[]>;

    };

    const validation = extractValidationErrors(o.errors);

    if (validation) {

      return validation;

    }

    return o.error ?? o.message ?? o.Message ?? o.title ?? null;

  }

  return null;

}



function extractValidationErrors(errors?: Record<string, string[]>): string | null {

  if (!errors) {

    return null;

  }

  const messages = Object.values(errors).flat().filter(Boolean);

  return messages.length > 0 ? messages.join(' ') : null;

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


