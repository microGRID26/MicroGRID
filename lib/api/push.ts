/**
 * Send push notification to a customer via the /api/portal/push endpoint.
 * Fire-and-forget — errors are logged but never block the caller.
 */
export function sendCustomerPush(
  projectId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): void {
  fetch('/api/portal/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, title, body, data }),
  }).catch(err => console.error('[push] send failed:', err))
}
