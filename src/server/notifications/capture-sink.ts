import "server-only";
// Deliberately no transport, credentials, addresses, rendering or network API.
export function captureEnvelope(input: { notificationId: string; payloadHash: string }) {
  return { captureId: `capture:${input.notificationId}`, payloadHash: input.payloadHash };
}
