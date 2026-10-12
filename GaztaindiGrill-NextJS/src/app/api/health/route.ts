// Liveness probe for the Docker healthcheck: answers as long as the server is up.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ ok: true })
}
