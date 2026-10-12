import 'server-only'

// Error bodies keep the { success, message } shape the client already shows in its toasts.
export const fail = (message: string, status: number) =>
  Response.json({ success: false, message }, { status })

// Drizzle wraps the driver error in one that only holds the SQL; the reason is in `cause`.
export const describe = (e: unknown): string => {
  if (!(e instanceof Error)) return String(e)
  return e.cause instanceof Error ? e.cause.message : e.message
}

export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

export const parseId = (raw: string): number | null => {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

// A UNIQUE column hit is the caller's mistake, not a server fault.
export const isDuplicateEntry = (e: unknown) =>
  e instanceof Error && (e.cause as { code?: string } | undefined)?.code === 'ER_DUP_ENTRY'
