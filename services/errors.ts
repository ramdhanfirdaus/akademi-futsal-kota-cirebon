/** Human-readable message from an API error (envelope message, first validation error, or a fallback). */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  if (data?.message) return data.message;
  // The host cut the request off (e.g. Netlify's function time limit): say so instead of a generic error.
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 502 || status === 504 || (err as { code?: string })?.code === 'ECONNABORTED') {
    return 'Server terlalu lama merespons. Coba lagi beberapa saat lagi.';
  }
  if (err instanceof Error && !('response' in err)) return err.message || fallback;
  return fallback;
}
