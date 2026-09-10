// The app is a static export reachable both by LAN IP and by its Tailscale name, so a host
// baked into the bundle at build time breaks whichever of the two it is not. It comes from
// the URL the page was served from instead.

export const resolveHost = (): string => {
  // In dev the page comes from the laptop while the API and the broker live on the HA host.
  // NODE_ENV is 'production' in a build, so this branch never reaches the export.
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_HOST) {
    return process.env.NEXT_PUBLIC_DEV_HOST
  }

  // Prerender runs this with no window; callers must resolve inside effects or handlers.
  if (typeof window === 'undefined') return ''

  return window.location.hostname
}

export const apiBaseUrl = (): string => {
  const host = resolveHost()
  if (!host) return ''
  const port = process.env.NEXT_PUBLIC_API_PORT || '8000'
  return `http://${host}:${port}`
}
