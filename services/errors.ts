/** Human-readable message from an API error (envelope message, first validation error, or a fallback). */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  if (data?.message) return data.message;
  if (err instanceof Error && !('response' in err)) return err.message || fallback;
  return fallback;
}
